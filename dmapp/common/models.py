#encoding: utf8
"""Server Models"""
import os, uuid
import numpy as np
import csv, json
from flask.ext.restful import Resource, reqparse, request
import pandas as pd
import h5py as h5
from dmapp import app


def conseq(arr):
    """Return the length of consecutive array elements that are true."""
    out = np.diff(np.where(np.concatenate(([arr[0]], arr[:-1] != arr[1:], [True])))[0])[::2]
    if len(out) == 0:
        return [0,]
    else:
        return out


class OfflineData():
    """The simulation setup is fixed and not controlled by the config file. It's
    hence useless to try to link the config to the output of this class. A better
    solution seems to hard-code the configuration into the h5 file, so it's
    self-descriptive.
    """
    var = 'data'
    def __init__(self, fn):
        self.fn = fn
        
        # Get meta data
        with h5.File(self.fn, 'r') as F:

            # Sanity checks
            data = F[self.var]

            assert data.dims[-1].label == 'time'
                       
            # Create DataFrame
            self.nt = data.shape[-1]
            self.shape = data.shape[:-1]
            self.len = np.prod(self.shape)

            # Get dimensions and scales
            self.dims = [d.label for d in data.dims.keys()][:-1]
            self.scale = [F[d][:] for d in self.dims]
            self.grids = np.array(np.meshgrid(*self.scale, indexing='ij'))

            assert np.shape(self.grids[0]) == self.shape
            
            self.df = None
            

    def slicing(self, **kwds):
        # Compute the nd-slice from the kwds
        sl = []
        for (dim, vals) in zip(self.dims, self.scale):
            v = kwds.get(dim)
            if v is not None:
                if np.iterable(v):
                    sl.append( map(list(vals).index, v) )
                else:
                    sl.append( list(vals).index(v) )
            else:
                sl.append( slice(None) )
            
        return tuple(sl)

    def execute(self, **kwds):
        """Compute the variable of interest."""
        # Reference series, do not rely on it for shape inference because
        # levers are not represented as in the main array.
        ref = pd.read_hdf(self.fn, 'ref')
        self.ref = self.compute(ref)
        self.sl = self.slicing(**kwds)
        
        # Open the source file and compute the function on the slice.
        #-------------------------- WARNING ---------------------------# 
        # Slicing an h5py array does not always result in the same 
        # output as slicing the same Numpy array. See https://github.com/h5py/h5py/issues/652
        # -------------------------------------------------------------#
        with h5.File(self.fn, 'r') as F:
            source = pd.DataFrame(data=F[self.var][self.sl].reshape(-1, self.nt).T, \
                                   index=ref.index)
            source.columns.name = 'scenarios'
            self.df = pd.DataFrame( self.compute(source) )
            
        # Transpose the array so that the case is the index. 
        if self.df.columns.name == 'scenarios':
            self.df = self.df.transpose()
            
        # Check if the result from each individual case is multi-valued.
        self.iterable = len(self.df.columns) > 1
        
            
    def df_dimensions(self):
        """Return a DataFrame of the dimensions associated with the 
        computed values."""
        out = pd.DataFrame(index=self.df.index)
        
        # Work around hdf5 difference with indexing compared to numpy
        IF = h5.File(str(uuid.uuid4())+'.h5', 'w', driver='core', backing_store=False) # in memory file
        for dim, gr, scale in zip(self.dims, self.grids, self.scale):
            X = IF.create_dataset(dim, data=gr)
            out[dim] = X[self.sl].astype(scale.dtype).flat
            
        IF.close()
        return out
    
    def df_index(self, *args):
        """Return the DataFrame index given the UV grid indices."""
        a = [np.arange(self.shape[i])[a] for (i,a) in enumerate(args)]
        return np.ravel_multi_index(a, self.shape)

    def grid_index(self, i):
        """Return the ND array indices given a flat index."""
        return np.unravel_index(i, self.shape)

    def compute(self, df):
        """To be subclassed."""
        return df

    def __aggregate(self):
        """Return a DataFrame including the dimensions and a values
        field where TimeSeries are aggregated."""
        if self.df is None:
            self.execute()
            
        out = self.df_dimensions()
        if self.iterable:
            out['values'] = [list(self.df.ix[i].astype(float)) for i in range(len(out))] # need to convert to float otherwise the JSON encoder chokes.
        else:
            out['values'] = self.df
        
        # Create unique hash from data values. This will be used to avoid storing duplicates. 
        # out['hash'] = self.df.apply(lambda x: hash(tuple(x)), axis = 1)
        
        return out
        
    def size(self, **kwds):
        sl = self.slicing(**kwds)
        return self.grids[0][sl].size
        
    def to_table(self):
        """Return table with header
        Lever, UV1, UV2, ..., ColName
        """
        out = self.__aggregate()
        header = list(out.columns)
        values = out.values.tolist()
        return [header,] + values

    def to_matrix(self):
        """Return matrix from DataFrame."""
        if self.df is None:
            self.execute()
        
        return df.values.reshape(self.shape)

    def to_csv(self, fn=None):
        """Write results to csv."""
        out = self.__aggregate()
        return out.to_csv(fn, index=False)

    def to_dict(self):
        out = self.__aggregate()            
        return out.astype('object').to_dict(orient='records')

    def to_json(self, fn=None):
        out = self.__aggregate()
        return out.to_json(fn, orient='records')
    
    def ptp(self):
        out = self.__aggregate()
        return self.df.values.min(), self.df.values.max()
            
class Metric(OfflineData, Resource):
    multivalued = None
    def compute(self, df, **kwds):
        """To be subclassed. Returned a scalar metric for each combination
        of uncertain variables.
        """
        return df

    def get(self):
        return self.to_table()
            
class ClimatologicalMeanFlow(Metric):
    multivalued = False
    def compute(self, df):
        """Return the climatological mean flow.
        Scrap the first year and set negative values to NaNs.
        """
        df[df<0] = np.nan
        out = df.resample('A', lambda x: x.values.mean(), kind='period')[1:].mean()
        try:
            out.name = 'ClimatologicalMean'
        except:
            pass
        return out
#        
class ClimatologicalEnergy(ClimatologicalMeanFlow):
    multivalued = False
    def compute(self, df):
        """Return the climatological mean flow.
        Scrap the first year and set negative values to NaNs.
        """
        df[df<0] = np.nan
        out = df.resample('A', lambda x: x.values.sum(), kind='period')[1:].mean()
        try:
            out.name = 'ClimatologicalMean'
        except:
            pass
        return out
#        
class ClimatologicalMeanMonthlyEnergy(Metric):
    def compute(self, df):
        """Return the mean monthly energy from monthly energy."""
        out = df[12:].groupby(lambda x: x.month).mean()
        out.name = 'ClimatologicalMeanMonthlyEnergy'
        return out.T
#        
class MonthlyEnergy(Metric):
    def compute(self, df):
        """Return the monthly energy.
        """
        out = df
        out.name = 'MonthlyEnergy'
        return out.T
#
class AnnualEnergy(Metric):
    def compute(self, df):
        df[df<0] = np.nan
        df.fillna(df.mean(), inplace=True) # valeurs aberrantes dans HQ 105
        
        out = df.resample('A', lambda x: x.values.sum(), kind='period')[1:]
        
        out.name = 'AnnualEnergy'
        return out
#
class ClimatologicalSpill(ClimatologicalMeanFlow):
    pass
        
### Public simulation ###
class PubEnergy(Metric):
    var = 'data'
    multivalued = False
    def compute(self, df):
        return df.resample('A', lambda x: x.values.sum(), kind='period').mean()
#        
class FirmEnergy(Metric):
    var = 'data'
    multivalued = False
    def compute(self, df):
        return df.resample('A', lambda x: x.values.sum(), kind='period').min()
#        
class Spill(Metric):
    var = 'spill'
    
    multivalued = False
    def compute(self, df):
        return df.mean()
#        
class DrawDown(Metric):
    var = 'level'
    def compute(self, df):
        hmax = df.resample('A', how=lambda x: x.values.max())
        hmin = df.resample('A', how=lambda x: x.values.min())
        return (hmax - hmin).mean()
#
class Area(Metric):
    var = 'area'
    def compute(self, df):
        return df.max()

# This is badly implemented. 
class EIA(Resource):
    """Price scenarios from the EIA Annual Energy Outlook.
    
    These prices are consumer prices, and I understand they are not 
    representative of the gross sales prices that producers get 
    when trading energy. So what we extract from these scenarios is
    the growth rate, which we then apply to a reference price that comes
    from the interface historical price data. 
    
    1E6 BTU : 293.07107 kilowatt hours
    
    Test with 
    curl -H "Content-type: application/json" -X GET -d '{"target":"2060"}' http://127.0.0.1:5000/api/expert/eia/mh/en
    """    
    def __init__(self):
        """Reference price and reference year."""
        
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('target', type=int)
        self.parser.add_argument('ref', type=float)
        self.parser.add_argument('dollars', type=int) # year for $ given in ref. 
        
        
        # Consumer price index - to compute inflation
        f = os.path.join(app.root_path, 'common', 'cpi.h5')
        self.cpi = pd.read_hdf(f, 'CPI')
        
        #Conversion from $/M BTU to $/MWh
        self.f=3.412
        
        self.ref_year = 2012
        self.horizon = 2040
        
        self.dim = "lmp"
        self.meta_dim = {'en': 'Scenario', 'fr':u'Scénario'}
                    
        # Horizon is 2040, prices are in 2012 US$ per million BTU.    
        # http://www.eia.gov/beta/aeo/#/?id=3-AEO2014&region=1-4&cases=ref2014~highmacro~lowmacro~highprice~lowprice~extended&start=2011&end=2040&f=L&linechart=3-AEO2014.3.extended-d022814a
        
        new_england_industrial = """
            _ref_:_ref_:                              35.087
            Reference:Référence:                 40.372
            High economic growth:Forte croissance économique: 40.480
            Low economic growth:Faible croissance économique:39.377
            High oil price:Prix du pétrole élevé:  42.559
            Low oil price:Prix du pétrole bas:                      40.116
            Extended policies:Politiques étendues:                  35.656
            No sunset:Sans 'sunset':                          36.856
            Accelerated nuclear retirements:Retrait du nucléaire accéléré:    41.251
            High nuclear:Nucléaire élevé:                       39.115
            Accelerated coal retirements:Retrait du charbon accéléré:       41.290
            Accelerated nuclear and coal retiremements:Retrait du nucléaire et du charbon accéléré:43.487
            Low nuclear:Nucléaire bas:                        32.695
            ESICA legislation:Législation ESICA:                  39.545
            Low coal cost:Coût du charbon bas:                      40.379
            High coal cost:Coût du charbon élevé:                     40.210
            Low renewables technology cost:Faible coût des énergies renouvelables:     38.486
            Low oil and gas resource:Ressources faibles en pétrole et gaz:           46.196
            High oil and gas resource:Ressources élevées en pétrole et gaz:          32.940
            2013 demand technology:Demande énergétique - technologie  de 2013:             42.689
            High demand technology:Demande énergétique - élevée:             34.342
            Best available demand technology:Demande énergétique - meilleure technologie:   32.904
            No GHG concern:Sans préoccupation sur les GES:                     40.373
            GHG 10$:Coût des GES à 10s/tonne:                            42.262
            GHG 25$:Coût des GES à 25s/tonne:                            45.286
            GHG 10$ and low gas price:Coût des GES à 10s/tonne et faible coût du pétrole:          37.098
            Low electricity demand:Faible demande électrique:             35.642
        """
        self.data = {}
        self.data['pub'] = self.parse(new_england_industrial)
        
        self._ref = {}; self.growth = {}
        
        for site in ['pub']:
            self.growth[site] = {}
            self._ref[site] = self.data[site]['value'].pop(0)
            self.data[site]['en'].pop(0)
            self.data[site]['fr'].pop(0)
            
            self.growth[site] = self.growth_rate(np.array(self.data[site]['value']), self._ref[site]) 
        
    def parse(self, txt):
        """Parse data and return dict."""
        out = {'value': [], 'en':[], 'fr':[]}
        for line in txt.splitlines():
            if line.strip():
                en, fr, val = line.split(':')
                if en == '_ref_':
                    out
                out['en'].append(en.strip())
                out['fr'].append(fr.strip())
                out['value'].append(float(val))
        return out
#                        
    def growth_rate(self, val, ref):
        """Compute the growth rate.
        
        Parameters
        ----------
        val : float
          Price at horizon.  
        ref : float
          Price at reference year.
        """
        return (val/ref) ** (1./(self.horizon-self.ref_year))
#        
    def extrapolate(self, ref, growth, target):
        """Extrapolate the value to target year, starting from the 
        reference price.
        
        Parameters
        ----------
        ref : float
          Price at reference year.
        growth : float
          Annual price rate.
        target : int
          Year when the price is to be computed.
        """
        
        return ref * growth ** (target - self.ref_year)
#        
    def inflation_factor(self, ref_year=2012, target_year=2015):
        """Return price corrected for inflation between the reference 
        year and the specified year."""
        r = self.cpi[str(ref_year)].mean()
        f = self.cpi[str(target_year)].mean()
        
        return f/r
#        
    def get(self, site, lang):
        """Return price scenarios in 2015$/MWh
        """
        args = self.parser.parse_args()
        target = args['target'] or 2040
        dollars = args['dollars'] or self.ref_year
        ref = (args['ref'] or self._ref[site]*self.f) * self.inflation_factor(dollars, 2015)
        
        keys = self.data[site][lang]
        values = list(self.growth[site])
        
        out = [{self.meta_dim[lang]:k, self.dim:self.extrapolate(ref, v, target)} for (k,v) in zip(keys,values)]
        
        return out    
        


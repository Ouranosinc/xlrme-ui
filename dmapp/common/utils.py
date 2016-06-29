import numpy as np
import os
import models as M

DIR = 'dmapp'

   
def do_pub():
    site = 'pub'
    fn = os.path.join(DIR, site, 'private', 'monthly_energy.h5')

    PE = M.PubEnergy(fn)
    PE.to_json(os.path.join(DIR, 'static', site, 'climenergy.json'))

    FE = M.FirmEnergy(fn)    
    FE.to_json(os.path.join(DIR, 'static', site, 'firmenergy.json'))

    FE = M.Spill(fn)    
    FE.to_json(os.path.join(DIR, 'static', site, 'climspill.json'))

    DD = M.DrawDown(fn)
    DD.to_json(os.path.join(DIR, 'static', site, 'climdd.json'))
    
    A = M.Area(fn)
    A.to_json(os.path.join(DIR, 'static', site, 'area.json'))

class Interpolator(object):
    """Linearly interpolate a value at any given year using mean 
    reference values and mean future values. 
    
    Parameters
    ----------
    refy : int
      Reference year.
    futy : int
      Future year.  
    ref : scalar or array-like
      Annual or monthly means over the reference period.
    fut : scalar or array-like
      Annual or monthly means over the future period.
      
    Methods
    -------
    interpolate(year) : return the annual mean or monthly values for any
      given year by interpolation. 
    
    """
    def __init__(self, refy, futy, ref, fut): 
        self.refy = refy
        self.futy = futy
        self.ref = np.asarray(ref)
        self.fut = np.asarray(fut)
        self.delta = self.fut - self.ref
        
    def interpolate(self, year):
        sf = (year - self.refy) / (self.futy - self.refy)
        return self.ref + sf * self.delta
        
    __call__ = interpolate

                

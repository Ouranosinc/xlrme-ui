#!python
import os
from flask import g, request
from flask.ext import restful
from flask.ext.login import login_required
from flask.ext.cors import CORS
import json, csv, types
from .common import models as M
from users import login_required
from dmapp import app
from flask_restful import reqparse, inputs
import logging
import importlib
from flask.json import jsonify, dumps
#from view import before

app.config['CORS_ALLOW_HEADERS'] = ["Content-Type", "Authorization"]
app.config['CORS_RESOURCES'] = {r"/api/*": {"origins": "*"}} 

api = restful.Api(app)

def api_route(self, *args, **kwargs):
    def wrapper(cls):
        self.add_resource(cls, *args, **kwargs)
        return cls
    return wrapper

api.route = types.MethodType(api_route, api)


class Resource(restful.Resource):
    pass
    #method_decorators = [login_required]  


@api.route('/api/config/<site>/<lang_code>')
class Config(Resource):
    def get(self, site):
        mod = importlib.import_module('dmapp.{0}.config'.format(site))
        out = jsonify(dict((key, [(o.serialize() if hasattr(o, 'serialize') else o) for o in getattr(mod,key)]) for (key) in mod.__all__))
        return out

@api.route('/api/<name>/<site>/<lang_code>')
class LoadStatic(Resource):
    
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('size', type=inputs.boolean, location='args')
        
        super(LoadStatic, self).__init__()
        
    def get(self, name, site, lang='en'):
        args = self.reqparse.parse_args()
        size = args.pop('size')
        
        fn = os.path.join(site, name+'.json')
        if size is True:
            return 0
        
        try:
            return app.send_static_file(fn)
        except:
            fn = os.path.join('static', site, name+'.csv')
            with app.open_resource(fn) as f:
                header = f.readline().strip().split(',')
                return list(csv.DictReader(f, header))
            
                        
@api.route('/api/climenergy_slice/<site>/<lang_code>')
class ClimEnergy(Resource):
    baseClass = M.ClimatologicalEnergy
    baseFile = 'monthly_energy.h5'
    
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('lever', type=int, action='append', location='args')
        self.reqparse.add_argument('dP', type=float, location='args')
        self.reqparse.add_argument('dT', type=float, location='args')
        self.reqparse.add_argument('dPs', type=float, location='args')
        self.reqparse.add_argument('dTs', type=float, location='args')
        self.reqparse.add_argument('size', type=inputs.boolean, location='args')
        
        super(ClimEnergy, self).__init__()
        

    def get(self, site, lang_code='en'):
        fn = os.path.join(app.root_path, site, 'private', self.baseFile)
        O = self.baseClass(fn)
        args = self.reqparse.parse_args()
        app.logger.info(request.query_string)
        #app.logger.info('args: {0}'.format(args))
        size = args.pop('size')
        
        if size is True:
            return O.size(**args)
        else:
            O.execute(**args)
            return O.to_dict()

@api.route('/api/climmonenergy_slice/<site>/<lang_code>')
class ClimMonEnergy(ClimEnergy):
    baseClass = M.ClimatologicalMeanMonthlyEnergy

@api.route('/api/firmenergy_slice/<site>/<lang_code>')
class FirmEnergy(ClimEnergy):
    baseClass = M.FirmEnergy

@api.route('/api/monenergy_slice/<site>/<lang_code>')
class MonEnergy(ClimEnergy):
    baseClass = M.MonthlyEnergy

@api.route('/api/monenergy_slice/pub/<lang_code>')
class MonPubEnergy(ClimEnergy):
    baseClass = M.MonthlyEnergy
    
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('lever', type=int, action='append', location='args')
        self.reqparse.add_argument('dQ', type=float, location='args')
        self.reqparse.add_argument('dP', type=float, location='args')
        self.reqparse.add_argument('size', type=inputs.boolean, location='args')
        
        super(ClimEnergy, self).__init__()
        
    def get(self, lang_code='en'):
        fn = os.path.join(app.root_path, 'pub', 'private', self.baseFile)
        O = self.baseClass(fn)
        args = self.reqparse.parse_args()
        
        size = args.pop('size')
        
        if size is True:
            return O.size(**args)
        else:
            O.execute(**args)
            return O.to_dict()
        
@api.route('/api/annualenergy_slice/<site>/<lang_code>')
class AnnualEnergy(ClimEnergy):
    baseClass = M.AnnualEnergy

@api.route('/api/climspill_slice/<site>/<lang_code>')
class ClimSpill(ClimEnergy):
    baseClass = M.ClimatologicalSpill
    baseFile = "monthly_spill.h5"
    
api.add_resource(M.EIA, '/api/eia/<site>/<lang>')

cors = CORS(app)


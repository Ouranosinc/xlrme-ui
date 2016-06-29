#encoding: utf8
"""Application content configuration"""

from flask.ext.babel import lazy_gettext 
from flask.json import JSONEncoder

class UV(JSONEncoder):
  def __init__(self, key, label, name, default, desc="", unit="", dx=None, domain=None, step=None):    
    for k, v in vars().items():
      if v != self and v is not None: setattr(self, k, v)

  def serialize(self):    
    return dict((k, (v.serialize() if hasattr(v, 'serialize') else v)) for (k,v) in self.__dict__.items())
#
class Spec(UV):
  key = lazy_gettext("key")
  def __init__(self, value, min=0, max="Infinity", show=True):
    key = self.key
    for k, v in vars().items():
      if v != self: setattr(self, k, v)
# 
class Cost(Spec):
  key = lazy_gettext(u"Cost (M$)")
#
class Amortizement(Spec):
  key = lazy_gettext(u"Amortizement")
  def __init__(self, value=30, min=2, max=49, show=False):
    key = self.key
    for k, v in vars().items():
      if v != self: setattr(self, k, v)
#
class Init(Spec):
  key = lazy_gettext(u"Start date")
  def __init__(self, value=2014, min=2004, max=2030, show=False):
    key = self.key
    for k, v in vars().items():
      if v != self: setattr(self, k, v)
#
class Constr(Init):
  key = lazy_gettext(u"Construction date")
#
class InService(Init):
  key = lazy_gettext(u"In service date")
#
class Metric(UV):
  def __init__(self, key, name, label, unit, api, dims, desc="", checked=False, bounds=None):
    for k, v in vars().items():
      if v != self: setattr(self, k, v)
#
class Expert(UV):
  def __init__(self, key, name, label, dims, api, args={}, desc="", metaDims=[], filters=None):
    for k, v in vars().items():
      if v != self and v is not None: setattr(self, k, v)
#
chartTypes=[dict(label=lazy_gettext(u'ValueMap'), key='HM', value='HM', axes=['X', 'Y'], levers='radio',  checked=True, constructor='HeatMapWindow'),
            dict(label=lazy_gettext(u'RegretMap'), key='RG', value='RG', axes=['X', 'Y'], levers='checkbox', constructor='RegretMapWindow'),
            dict(label=lazy_gettext(u'LeverLines'), key='LC', value='LC', axes=['X'], levers='checkbox', constructor='LineChartWindow'),
            ]
            


#encoding: utf8
"""Application content configuration"""

from flask.ext.babel import lazy_gettext 
from dmapp.common.config import *

__all__ = ['uncertainVariables', 'levers', 'metrics', 'expert', 'UVDefaults', 'UVOrder', 'chartTypes']

class Lever(UV):
  def __init__(self, key, hmin, hmax, CF, name=None, desc=None, checked=False,
      cost=Cost(1000), constr=Constr(2020, min=2004), inservice=InService(2025, min=2025), amortizement=Amortizement(50, max=65)):
            
    for k, v in vars().items():
      if v != self: setattr(self, k, v)

uncertainVariables = [\
  UV("xQ", lazy_gettext(u"Streamflow change"), lazy_gettext(u"Streamflow change"), 1.5, desc=lazy_gettext(u"Mean annual streamflow change"), unit=u"%", dx=5),
  UV("xP", lazy_gettext(u"Demand pattern"), lazy_gettext(u"Transition to New-England demand pattern"), 0, desc=lazy_gettext(u"Transition to warmer demand pattern"), unit=u"-", dx=1/6.),
  UV("lmp", lazy_gettext(u"Price trend"), lazy_gettext(u"Energy price trend"), 40, desc=lazy_gettext(u"Energy price trend"), unit=u"$/MWh", dx=5, domain=[10,111], step=10),
  UV("rate", lazy_gettext(u"Discount"), lazy_gettext(u"Discount rate"), 3, desc=lazy_gettext(u"Anticipated return on investments with similar risk profiles."), unit=u"%", dx=0.25, domain=[-2,7], step=.25)
  ]

levers = [\
 Lever(1, 128, 134, .7, 'Small', 'Small reservoir', cost=Cost(6000), checked=True),
 Lever(2, 155, 170, .8, 'Medium/Energy', 'Medium reservoir for energy production', cost=Cost(8000)),
 Lever(3, 160, 170, .6, 'Medium/Capacity', 'Medium reservoir for capacity', cost=Cost(9000)),
 Lever(4, 170, 195, .6, 'Large', 'Large reservoir', cost=Cost(11000)),
  ]

metrics = [\
  Metric("E", lazy_gettext(u"Energy"), lazy_gettext(u"Annual energy production"), "GWh", "climenergy", ["lever", "xQ", "xP"], desc=lazy_gettext(u"Mean annual energy generated."), checked=True, bounds=[2400, 9200]),
  Metric("FE", lazy_gettext(u"Firm energy"), lazy_gettext(u"Firm annual energy production"), "GWh", "firmenergy", ["lever", "xQ", "xP"], desc=lazy_gettext(u"Annual energy guaranteed it will be generated."), bounds=[1400,9000]),
  Metric("S", lazy_gettext(u"Spill"), lazy_gettext(u"Mean monthly spill flow"), u"m³/s", "climspill", ["lever", "xQ", "xP"], desc=lazy_gettext(u"Mean monthly spill flow"), bounds=[0,205]),
  Metric('DD', lazy_gettext(u"Drawdown"), lazy_gettext(u"Mean annual reservoir fluctuation"), u"m", 'climdd', ['lever', 'xQ', 'xP'], desc=lazy_gettext(u"Mean annual reservoir fluctuations"), bounds=[0, 8]),
  Metric('Area', lazy_gettext(u"Flooded area"), lazy_gettext(u"Flooded area at maximal level"), u"m", 'area', ['lever', "xQ", "xP"], desc=lazy_gettext(u"Maximum flooded area"), bounds=[720, 2570]),
  Metric('IRR', lazy_gettext(u"IRR"), lazy_gettext(u"Internal Rate of Return"), u"%", 'monenergy_slice', ["lever", "xQ", "xP", "lmp"], desc=lazy_gettext(u"Internal rate of return of the investment")),
  Metric("NPV", lazy_gettext(u"NPV"), lazy_gettext(u"Net Present Value"), "M$", "monenergy_slice", ["lever", "xQ", "xP", "lmp", "rate"], desc=lazy_gettext(u"Net present value of the investment."))]


expert = [\
  Expert("cmip5", "CMIP5", lazy_gettext(u"Global climate model projections"), ["xQ", "xT"], "cmip5", desc=lazy_gettext(u"Runoff projections from CMIP5 models averaged over the watershed"), metaDims=["Model", "RCP", "Realization"], filters=[{"key":"RCP", "name":lazy_gettext(u"Emission scenario"), "value":["rcp26", "rcp45", "rcp60", "rcp85"]}]),
  Expert("eia", "EIA", "Energy Information Administration", ["lmp"], "eia", args={"ref":35.27, "target":2055, "dollars":"2015"}, desc=lazy_gettext(u"U.S. Energy Information Administration Electricity price forecasts"), metaDims=["Scenario"]),
  Expert("rate", lazy_gettext(u"Discount rate"), lazy_gettext(u"Discount rate"), ["rate"], "rate", desc=lazy_gettext(u"Discount rates used by various agencies"), metaDims=[lazy_gettext(u"Scenario")])]

UVDefaults = {"Y":"xQ", "X":"xP", "slider1":"lmp", "slider2":"rate"},

UVOrder = ["xQ", "xP", "lmp", "rate"]
	


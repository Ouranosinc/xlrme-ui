from flask.ext.assets import Bundle, Environment
from .. import app, api


bundles = {

    'base_js': Bundle(
        "js/lib/jquery-1.11.0.min.js",
        "js/lib/jquery-ui/jquery-ui.min.js",
        "js/lib/ext-jquery-ui.min.js",
        ),

    'app_js': Bundle(
        "js/lib/d3.min.js",
        "js/lib/nv.d3.min.js",
        "js/lib/crossfilter.min.js","js/app.js",
        "js/lib/d3.tip.js",
        "js/lib/newton.js",
        "js/app.charts.js",
        "js/script.js"),

    'base_css': Bundle(
        "js/lib/jquery-ui/jquery-ui.min.css",
        "js/lib/jquery-ui/jquery-ui.theme.css",
        "css/lib/ext-jquery-ui.css",
        "css/lib/nv.d3.min.css",
        "css/app.css",
        "css/style.css",
        output='gen/base.css'),
        
     'imgs':Bundle(
        "js/lib/jquery-ui/images/*", 
        output='gen/images/'),
}


assets = Environment(app)
assets.register(bundles)




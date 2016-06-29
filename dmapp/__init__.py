# -*- coding: utf-8 -*-
from flask import Flask
from flask.ext.babel import Babel
from flask.json import JSONEncoder as BaseEncoder
from speaklater import _LazyString


app = Flask(__name__, instance_relative_config=True)
app.config.from_pyfile('config.py')

app.config.update(
    LANGUAGES = {
    'en': 'English',
    'fr': u'Français'},
    )

# Translation
class JSONEncoder(BaseEncoder):
    """Class to decode lazy strings used in the config files for translation."""
    def default(self, o):
        if isinstance(o, _LazyString):
            return o.encode('utf8')
            
        return BaseEncoder.default(self, o)
        
app.json_encoder = JSONEncoder

babel = Babel(app)

# Views
import dmapp.views

# Assets (JS / CSS)
import common.assets

#import api
import common
import api

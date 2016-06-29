from dmapp import app
from flask import request, Response, g, current_app
from flask.ext.login import LoginManager, UserMixin, current_user
from flask.ext.httpauth import HTTPBasicAuth
from functools import wraps


app.config.from_object('settings')

login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(id):
    return User.get(id)
    
def login_required(func):
    '''
    If you decorate a view with this, it will ensure that the current user is
    logged in and authenticated before calling the actual view. (If they are
    not, it calls the :attr:`LoginManager.unauthorized` callback.) For
    example::

        @app.route('/post')
        @login_required
        def post():
            pass
    '''
    @wraps(func)
    def decorated_view(*args, **kwargs):
        site = request.view_args['site']
        if current_app.login_manager._login_disabled:
            return func(*args, **kwargs)
        elif not (current_user.is_authenticated and site in current_user.realms):
            return current_app.login_manager.unauthorized()
        return func(*args, **kwargs)
    return decorated_view

class User(UserMixin):
    '''Simple User class'''
    USERS = {
        # username: password
        }
    
    REALMS = {# pub: [list of users]
            }

    def __init__(self, id):
        if not id in self.USERS:
            raise UserNotFoundError()
        self.id = id
        self.password = self.USERS[id]
        self.realms = [k for (k,v) in self.REALMS.items() if (id in v)] + ['pub',]

    @classmethod
    def get(self_class, id):
        '''Return user instance of id, return None if not exist'''
        try:
            return self_class(id)
        except UserNotFoundError:
            return None
    
    
    
    

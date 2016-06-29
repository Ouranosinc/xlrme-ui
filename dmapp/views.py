from dmapp import app
from flask import render_template, request, g, redirect, url_for, flash, send_from_directory, abort
from flask import g
from flask.ext.babel import gettext, refresh
from flask.ext.login import login_user, logout_user
from users import User, login_required
from dmapp import babel



@babel.localeselector
def get_locale():
    match = request.accept_languages.best_match(app.config.get('LANGUAGES').keys())
    return g.get('current_lang', match or 'en')
    
@app.before_request
def before():
    if request.view_args and 'lang_code' in request.view_args:
        if request.view_args['lang_code'] not in app.config.get('LANGUAGES').keys():
            return abort(404)
        else:
            g.current_lang = request.view_args['lang_code']
            request.view_args.pop('lang_code')
            
@app.route('/')
def root():
    return redirect(url_for('index', lang_code=get_locale()))

@app.route('/<lang_code>')
def index():
    return render_template('index.html')

@app.route('/<lang_code>/about')
def about():
    return render_template('about.html')

@app.route('/<lang_code>/aboutPub')
def aboutPub():
    return render_template('aboutPub.html')

@app.route('/<lang_code>/pub')
def dash_pub():
    return render_template('dash.html', site='pub')

@app.route('/<lang_code>/<site>')
@login_required
def dash(site):
    return render_template('dash.html', site=site)

@app.route('/lang', methods=["post"])
def lang_switcher():
    lang_code = request.form['lang_code']
    with app.test_request_context(request.referrer) as request_ctx:
        url_rule = request_ctx.request.url_rule
        args = request_ctx.request.view_args
    
    args['lang_code']=lang_code
    return redirect(url_rule.build(args)[1])
        
@app.route('/favicon.ico')
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])


@app.route('/login/check', methods=["post"])
def login_check():
    # validate username and password
    user = User.get(request.form['username'])
    remember = request.form.get('remember-me', '0')  == '1'
    if (user and user.password == request.form['password']):
        login_user(user, remember=remember)
    else:
        flash('Username or password incorrect')
        
    return redirect(request.referrer)
    
@app.route("/logout")
def logout():
    logout_user()
    return render_template('index.html')
    


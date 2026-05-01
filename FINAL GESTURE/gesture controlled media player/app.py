from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/gesture_player'
mongo = PyMongo(app)

# JWT Token Required Decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('token')
        if not token:
            return redirect(url_for('login'))
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = mongo.db.users.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return redirect(url_for('login'))
        except:
            return redirect(url_for('login'))
        return f(current_user, *args, **kwargs)
    return decorated

# Routes
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        # Check if user exists
        if mongo.db.users.find_one({'email': email}):
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        user_data = {
            'name': name,
            'email': email,
            'password_hash': password_hash,
            'created_at': datetime.datetime.utcnow()
        }
        mongo.db.users.insert_one(user_data)
        
        return jsonify({'message': 'Registration successful'}), 201
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        user = mongo.db.users.find_one({'email': email})
        
        if user and check_password_hash(user['password_hash'], password):
            # Generate JWT token
            token = jwt.encode({
                'user_id': str(user['_id']),
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm='HS256')
            
            response = jsonify({'message': 'Login successful'})
            response.set_cookie('token', token, httponly=True)
            return response
        
        return jsonify({'error': 'Invalid credentials'}), 401
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    response = redirect(url_for('home'))
    response.set_cookie('token', '', expires=0)
    return response


# Dashboard route removed per user request — dashboard page deprecated and its help/resources moved to the footer.
# Previous route kept in VCS history if needed.
@app.route('/instructions')
@token_required
def instructions(current_user):
    return render_template('instructions.html', user=current_user)

@app.route('/player')
@token_required
def player(current_user):
    return render_template('player.html', user=current_user)

@app.route('/feedback', methods=['GET', 'POST'])
@token_required
def feedback(current_user):
    return render_template('feedback.html', user=current_user)


@app.route('/help/getting-started')
@token_required
def help_getting_started(current_user):
    return render_template('help_getting_started.html', user=current_user)


@app.route('/help/faq')
@token_required
def help_faq(current_user):
    return render_template('help_faq.html', user=current_user)


@app.route('/help/contact-support')
@token_required
def help_contact_support(current_user):
    return render_template('help_contact_support.html', user=current_user)


@app.route('/help/privacy')
@token_required
def help_privacy(current_user):
    return render_template('help_privacy.html', user=current_user)


@app.route('/help/terms')
@token_required
def help_terms(current_user):
    return render_template('help_terms.html', user=current_user)

# API Routes
@app.route('/api/validate-youtube-url', methods=['POST'])
@token_required
def validate_youtube_url(current_user):
    data = request.get_json()
    url = data.get('url', '')
    
    # Simple YouTube URL validation 
    if 'youtube.com/watch?v=' in url or 'youtu.be/' in url:
        # Extract video ID
        if 'youtube.com/watch?v=' in url:
            video_id = url.split('v=')[1].split('&')[0]
        else:
            video_id = url.split('youtu.be/')[1].split('?')[0]
        
        embed_url = f"https://www.youtube.com/embed/{video_id}"
        return jsonify({'valid': True, 'embed_url': embed_url, 'video_id': video_id})
    
    return jsonify({'valid': False, 'error': 'Invalid YouTube URL'}), 400

if __name__ == '__main__':
    # MongoDB collections are created automatically on first use
    app.run(debug=True)
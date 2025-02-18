from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index_new2.html')

@app.route('/toggle_animation', methods=['POST'])
def toggle_animation():
    # Get the slider value (0 = do not trigger animation, 1 = trigger animation)
    slider_value = request.json.get('value', 0)

    # Check if the value is odd or even and return True for odd values
    is_odd = slider_value % 2 != 0

    return jsonify({'trigger': is_odd})


if __name__ == '__main__':
    app.run(debug=True)
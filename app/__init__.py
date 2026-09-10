from flask import Flask
from flask_wtf.csrf import CSRFProtect

from config import Config

csrf = CSRFProtect()


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    csrf.init_app(app)

    from app.routes.main import main_bp
    app.register_blueprint(main_bp)

    return app

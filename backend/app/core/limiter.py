"""
core/limiter.py — Configuración de limitación de tasa (Rate Limiting) con slowapi.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Limiter global identificado por dirección IP remota
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

from alembic import context
from sqlalchemy import create_engine, pool

from app import models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import get_settings
from app.db import Base

target_metadata = Base.metadata


def include_object(obj, name, type_, reflected, compare_to):
    # PostGIS ships its own tables (spatial_ref_sys, tiger, topology); never manage them here
    if type_ == 'table' and reflected and compare_to is None:
        return False
    return True


def run_migrations_online() -> None:
    url = context.config.attributes.get('database_url') or get_settings().database_url
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, include_object=include_object)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()

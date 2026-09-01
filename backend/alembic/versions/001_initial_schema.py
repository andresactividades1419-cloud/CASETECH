"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-24 00:00:00.000000

Esquema inicial relacional completo para CASETECH ERP basado en docs/04-modelo-datos.md.
Incluye 12 tablas, claves foráneas, restricciones CHECK, índices optimizados y datos semilla.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -------------------------------------------------------------
    # 1. Tabla: roles
    # -------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=50), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_roles"),
        sa.UniqueConstraint("nombre", name="uq_roles_nombre"),
    )
    op.create_index("idx_roles_nombre", "roles", ["nombre"], unique=True)

    # -------------------------------------------------------------
    # 2. Tabla: usuarios
    # -------------------------------------------------------------
    op.create_table(
        "usuarios",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nombre_completo", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("rol_id", sa.BigInteger(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            r"email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'",
            name="ck_usuarios_email_format",
        ),
        sa.ForeignKeyConstraint(["rol_id"], ["roles.id"], name="fk_usuarios_rol_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_usuarios"),
        sa.UniqueConstraint("email", name="uq_usuarios_email"),
    )
    op.create_index("idx_usuarios_email", "usuarios", ["email"], unique=True)
    op.create_index("idx_usuarios_rol_id", "usuarios", ["rol_id"])

    # -------------------------------------------------------------
    # 3. Tabla: proveedores
    # -------------------------------------------------------------
    op.create_table(
        "proveedores",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nit", sa.String(length=20), nullable=False),
        sa.Column("nombre_empresa", sa.String(length=255), nullable=False),
        sa.Column("contacto_nombre", sa.String(length=255), nullable=True),
        sa.Column("contacto_telefono", sa.String(length=20), nullable=True),
        sa.Column("contacto_email", sa.String(length=255), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_proveedores"),
        sa.UniqueConstraint("nit", name="uq_proveedores_nit"),
    )
    op.create_index("idx_proveedores_nit", "proveedores", ["nit"], unique=True)
    op.create_index("idx_proveedores_nombre", "proveedores", ["nombre_empresa"])

    # -------------------------------------------------------------
    # 4. Tabla: materiales
    # -------------------------------------------------------------
    op.create_table(
        "materiales",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("unidad_medida", sa.String(length=30), nullable=False),
        sa.Column("stock_actual", sa.Numeric(precision=12, scale=3), server_default=sa.text("0"), nullable=False),
        sa.Column("stock_minimo", sa.Numeric(precision=12, scale=3), server_default=sa.text("0"), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("stock_actual >= 0", name="ck_materiales_stock_actual_non_negative"),
        sa.CheckConstraint("stock_minimo >= 0", name="ck_materiales_stock_minimo_non_negative"),
        sa.PrimaryKeyConstraint("id", name="pk_materiales"),
        sa.UniqueConstraint("nombre", name="uq_materiales_nombre"),
    )
    op.create_index("idx_materiales_nombre", "materiales", ["nombre"], unique=True)
    op.create_index(
        "idx_materiales_stock_alerta",
        "materiales",
        ["stock_actual"],
        postgresql_where=sa.text("activo = true"),
    )

    # -------------------------------------------------------------
    # 5. Tabla: tipos_caseton
    # -------------------------------------------------------------
    op.create_table(
        "tipos_caseton",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("naturaleza", sa.String(length=20), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("naturaleza IN ('RECUPERABLE', 'PERDIDO')", name="ck_tipos_caseton_naturaleza"),
        sa.PrimaryKeyConstraint("id", name="pk_tipos_caseton"),
        sa.UniqueConstraint("nombre", name="uq_tipos_caseton_nombre"),
    )
    op.create_index("idx_tipos_caseton_nombre", "tipos_caseton", ["nombre"], unique=True)

    # -------------------------------------------------------------
    # 6. Tabla: recetas
    # -------------------------------------------------------------
    op.create_table(
        "recetas",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("tipo_caseton_id", sa.BigInteger(), nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("cantidad_por_unidad", sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("cantidad_por_unidad > 0", name="ck_recetas_cantidad_positive"),
        sa.ForeignKeyConstraint(["material_id"], ["materiales.id"], name="fk_recetas_material_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tipo_caseton_id"], ["tipos_caseton.id"], name="fk_recetas_tipo_caseton_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_recetas"),
        sa.UniqueConstraint("tipo_caseton_id", "material_id", name="uq_receta_tipo_material"),
    )
    op.create_index("idx_recetas_tipo_caseton", "recetas", ["tipo_caseton_id"])
    op.create_index("idx_recetas_material_id", "recetas", ["material_id"])

    # -------------------------------------------------------------
    # 7. Tabla: pedidos
    # -------------------------------------------------------------
    op.create_table(
        "pedidos",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("codigo_pedido", sa.String(length=20), nullable=False),
        sa.Column("cliente", sa.String(length=255), nullable=False),
        sa.Column("tipo_caseton_id", sa.BigInteger(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(length=20), server_default=sa.text("'PENDIENTE'"), nullable=False),
        sa.Column("fecha_entrega_estimada", sa.Date(), nullable=False),
        sa.Column("creado_por", sa.BigInteger(), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("cantidad > 0", name="ck_pedidos_cantidad_positive"),
        sa.CheckConstraint(
            "estado IN ('PENDIENTE', 'EN_PRODUCCION', 'COMPLETADO', 'CANCELADO')",
            name="ck_pedidos_estado",
        ),
        sa.ForeignKeyConstraint(["creado_por"], ["usuarios.id"], name="fk_pedidos_creado_por", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tipo_caseton_id"], ["tipos_caseton.id"], name="fk_pedidos_tipo_caseton_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_pedidos"),
        sa.UniqueConstraint("codigo_pedido", name="uq_pedidos_codigo_pedido"),
    )
    op.create_index("idx_pedidos_codigo_pedido", "pedidos", ["codigo_pedido"], unique=True)
    op.create_index("idx_pedidos_estado", "pedidos", ["estado"])
    op.create_index("idx_pedidos_cliente", "pedidos", ["cliente"])
    op.create_index("idx_pedidos_tipo_fecha", "pedidos", ["tipo_caseton_id", sa.text("created_at DESC")])

    # -------------------------------------------------------------
    # 8. Tabla: compras
    # -------------------------------------------------------------
    op.create_table(
        "compras",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("codigo_compra", sa.String(length=20), nullable=False),
        sa.Column("proveedor_id", sa.BigInteger(), nullable=False),
        sa.Column("fecha_compra", sa.Date(), nullable=False),
        sa.Column("total", sa.Numeric(precision=14, scale=2), server_default=sa.text("0"), nullable=False),
        sa.Column("registrado_por", sa.BigInteger(), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("total >= 0", name="ck_compras_total_non_negative"),
        sa.ForeignKeyConstraint(["proveedor_id"], ["proveedores.id"], name="fk_compras_proveedor_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["registrado_por"], ["usuarios.id"], name="fk_compras_registrado_por", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_compras"),
        sa.UniqueConstraint("codigo_compra", name="uq_compras_codigo_compra"),
    )
    op.create_index("idx_compras_codigo_compra", "compras", ["codigo_compra"], unique=True)
    op.create_index("idx_compras_proveedor_id", "compras", ["proveedor_id"])

    # -------------------------------------------------------------
    # 9. Tabla: detalle_compras
    # -------------------------------------------------------------
    op.create_table(
        "detalle_compras",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("compra_id", sa.BigInteger(), nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "subtotal",
            sa.Numeric(precision=14, scale=2),
            sa.Computed("cantidad * precio_unitario", persisted=True),
            nullable=False,
        ),
        sa.CheckConstraint("cantidad > 0", name="ck_detalle_compras_cantidad_positive"),
        sa.CheckConstraint("precio_unitario >= 0", name="ck_detalle_compras_precio_non_negative"),
        sa.ForeignKeyConstraint(["compra_id"], ["compras.id"], name="fk_detalle_compras_compra_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["material_id"], ["materiales.id"], name="fk_detalle_compras_material_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_detalle_compras"),
    )
    op.create_index("idx_detalle_compras_compra_id", "detalle_compras", ["compra_id"])
    op.create_index("idx_detalle_compras_material_id", "detalle_compras", ["material_id"])

    # -------------------------------------------------------------
    # 10. Tabla: movimientos_inventario
    # -------------------------------------------------------------
    op.create_table(
        "movimientos_inventario",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("tipo_movimiento", sa.String(length=40), nullable=False),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("stock_antes", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("stock_despues", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("referencia_id", sa.BigInteger(), nullable=True),
        sa.Column("referencia_tipo", sa.String(length=20), nullable=True),
        sa.Column("ejecutado_por", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "tipo_movimiento IN ("
            "'INGRESO_COMPRA', "
            "'DESCUENTO_PRODUCCION', "
            "'DESCUENTO_PRODUCCION_DEFINITIVO', "
            "'DEVOLUCION_CANCELACION', "
            "'AJUSTE_APROBADO'"
            ")",
            name="ck_movimientos_tipo_movimiento",
        ),
        sa.CheckConstraint(
            "referencia_tipo IS NULL OR referencia_tipo IN ('PEDIDO', 'COMPRA', 'AJUSTE')",
            name="ck_movimientos_referencia_tipo",
        ),
        sa.ForeignKeyConstraint(["ejecutado_por"], ["usuarios.id"], name="fk_movimientos_ejecutado_por", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["material_id"], ["materiales.id"], name="fk_movimientos_material_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_movimientos_inventario"),
    )
    op.create_index(
        "idx_movimientos_material_fecha",
        "movimientos_inventario",
        ["material_id", sa.text("created_at DESC")],
    )
    op.create_index("idx_movimientos_referencia", "movimientos_inventario", ["referencia_tipo", "referencia_id"])

    # -------------------------------------------------------------
    # 11. Tabla: ajustes_inventario
    # -------------------------------------------------------------
    op.create_table(
        "ajustes_inventario",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("tipo_ajuste", sa.String(length=20), nullable=False),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("stock_antes", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("stock_despues", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column("justificacion", sa.Text(), nullable=False),
        sa.Column("estado", sa.String(length=25), server_default=sa.text("'PENDIENTE_APROBACION'"), nullable=False),
        sa.Column("solicitado_por", sa.BigInteger(), nullable=False),
        sa.Column("aprobado_por", sa.BigInteger(), nullable=True),
        sa.Column("fecha_solicitud", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("fecha_aprobacion", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "tipo_ajuste IN ('MERMA', 'DEVOLUCION_PROVEEDOR', 'CONTEO_FISICO', 'SOBRANTE')",
            name="ck_ajustes_tipo_ajuste",
        ),
        sa.CheckConstraint("LENGTH(justificacion) >= 20", name="ck_ajustes_justificacion_min_length"),
        sa.CheckConstraint(
            "estado IN ('PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO')",
            name="ck_ajustes_estado",
        ),
        sa.ForeignKeyConstraint(["aprobado_por"], ["usuarios.id"], name="fk_ajustes_aprobado_por", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["material_id"], ["materiales.id"], name="fk_ajustes_material_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["solicitado_por"], ["usuarios.id"], name="fk_ajustes_solicitado_por", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_ajustes_inventario"),
    )
    op.create_index(
        "idx_ajustes_pendientes",
        "ajustes_inventario",
        ["estado"],
        postgresql_where=sa.text("estado = 'PENDIENTE_APROBACION'"),
    )

    # -------------------------------------------------------------
    # 12. Tabla: auditoria_acciones
    # -------------------------------------------------------------
    op.create_table(
        "auditoria_acciones",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.BigInteger(), nullable=True),
        sa.Column("accion", sa.String(length=50), nullable=False),
        sa.Column("entidad", sa.String(length=50), nullable=False),
        sa.Column("entidad_id", sa.BigInteger(), nullable=True),
        sa.Column("payload_antes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("payload_despues", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_origen", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], name="fk_auditoria_usuario_id", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_auditoria_acciones"),
    )
    op.create_index(
        "idx_auditoria_usuario_fecha",
        "auditoria_acciones",
        ["usuario_id", sa.text("created_at DESC")],
    )
    op.create_index("idx_auditoria_entidad", "auditoria_acciones", ["entidad", "entidad_id"])

    # -------------------------------------------------------------
    # 13. Datos semilla iniciales (Roles y Tipos de Casetón iniciales)
    # -------------------------------------------------------------
    op.execute(
        """
        INSERT INTO roles (nombre, descripcion) VALUES
          ('ADMINISTRADOR', 'Acceso completo: CRUD usuarios, proveedores, pedidos, inventario, auditoría.'),
          ('OPERARIO', 'Acceso de consulta operativa: pedidos e inventario. Sin modificación de datos.')
        ON CONFLICT (nombre) DO NOTHING;
        """
    )
    op.execute(
        """
        INSERT INTO tipos_caseton (nombre, descripcion, naturaleza) VALUES
          ('Casetón de Lona 60x60', 'Bastidor de madera con lona tensada. Módulo reutilizable.', 'RECUPERABLE'),
          ('Casetón de Guadua 60x60', 'Cercha estructural en guadua y madera con amarres. Módulo reutilizable.', 'RECUPERABLE'),
          ('Casetón de Icopor 60x60', 'Bloque de Poliestireno Expandido (EPS). Queda fundido en la losa.', 'PERDIDO')
        ON CONFLICT (nombre) DO NOTHING;
        """
    )


def downgrade() -> None:
    # Eliminación en orden inverso para respetar restricciones de clave foránea
    op.drop_table("auditoria_acciones")
    op.drop_table("ajustes_inventario")
    op.drop_table("movimientos_inventario")
    op.drop_table("detalle_compras")
    op.drop_table("compras")
    op.drop_table("pedidos")
    op.drop_table("recetas")
    op.drop_table("tipos_caseton")
    op.drop_table("materiales")
    op.drop_table("proveedores")
    op.drop_table("usuarios")
    op.drop_table("roles")

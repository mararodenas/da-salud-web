# Supabase — DA Salud

`01_base_acceso_clientes.sql` crea únicamente la infraestructura base de acceso:

- organizaciones/clientes;
- perfiles de usuarios;
- pertenencia de usuarios a organizaciones;
- roles;
- registro básico de auditoría;
- Row Level Security (RLS);
- creación automática del perfil al crear un usuario en Supabase Auth.

## No ejecutar aún si `da-salud-app` ya usa Supabase

Primero hay que revisar el esquema actual de la aplicación para evitar duplicaciones o conflictos.

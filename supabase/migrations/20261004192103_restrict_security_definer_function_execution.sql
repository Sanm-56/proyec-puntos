revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.set_user_role(uuid, text) from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;

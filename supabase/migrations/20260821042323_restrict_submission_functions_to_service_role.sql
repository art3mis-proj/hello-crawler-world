revoke all on function public.claim_sticker(text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.validate_sticker_download(text) from public, anon, authenticated;
revoke all on function public.cast_feature_vote(text, text) from public, anon, authenticated;
revoke all on function public.get_feature_vote_counts() from public, anon, authenticated;
revoke all on function public.register_volunteer_interest(text, text, text[]) from public, anon, authenticated;

grant execute on function public.claim_sticker(text, text, boolean, text) to service_role;
grant execute on function public.validate_sticker_download(text) to service_role;
grant execute on function public.cast_feature_vote(text, text) to service_role;
grant execute on function public.get_feature_vote_counts() to service_role;
grant execute on function public.register_volunteer_interest(text, text, text[]) to service_role;

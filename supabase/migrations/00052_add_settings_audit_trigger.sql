-- Create the trigger function for settings audit
create or replace function public.log_settings_change()
returns trigger as $$
begin
  if (tg_op = 'UPDATE') then
    if (old.value is distinct from new.value) then
      insert into public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
      values (auth.uid(), 'Updated Setting: ' || new.key, 'settings', new.id::text, jsonb_build_object('value', old.value), jsonb_build_object('value', new.value));
    end if;
  elsif (tg_op = 'INSERT') then
    insert into public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    values (auth.uid(), 'Created Setting: ' || new.key, 'settings', new.id::text, null, jsonb_build_object('value', new.value));
  elsif (tg_op = 'DELETE') then
    insert into public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    values (auth.uid(), 'Deleted Setting: ' || old.key, 'settings', old.id::text, jsonb_build_object('value', old.value), null);
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Create trigger on settings table
drop trigger if exists settings_audit_trigger on public.settings;
create trigger settings_audit_trigger
after insert or update or delete on public.settings
for each row execute function public.log_settings_change();

-- Also for roi_adjustments
create or replace function public.log_roi_adjustment_change()
returns trigger as $$
begin
  if (tg_op = 'UPDATE') then
    insert into public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    values (auth.uid(), 'Updated ROI Adjustment: ' || new.name, 'roi_adjustments', new.id::text, to_jsonb(old), to_jsonb(new));
  elsif (tg_op = 'INSERT') then
    insert into public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    values (auth.uid(), 'Created ROI Adjustment: ' || new.name, 'roi_adjustments', new.id::text, null, to_jsonb(new));
  elsif (tg_op = 'DELETE') then
    insert into public.admin_audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    values (auth.uid(), 'Deleted ROI Adjustment: ' || old.name, 'roi_adjustments', old.id::text, to_jsonb(old), null);
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists roi_adjustments_audit_trigger on public.roi_adjustments;
create trigger roi_adjustments_audit_trigger
after insert or update or delete on public.roi_adjustments
for each row execute function public.log_roi_adjustment_change();

create or replace function public.unit_canonical(input_unit text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := regexp_replace(lower(trim(coalesce(input_unit, 'unit'))), '\\.', '', 'g');
  normalized := regexp_replace(normalized, '\\s+', ' ', 'g');

  case normalized
    when 'teaspoon' then return 'tsp';
    when 'teaspoons' then return 'tsp';
    when 'tsp' then return 'tsp';

    when 'tablespoon' then return 'tbsp';
    when 'tablespoons' then return 'tbsp';
    when 'tbsp' then return 'tbsp';

    when 'cup' then return 'cup';
    when 'cups' then return 'cup';

    when 'milliliter' then return 'ml';
    when 'milliliters' then return 'ml';
    when 'ml' then return 'ml';

    when 'liter' then return 'l';
    when 'liters' then return 'l';
    when 'l' then return 'l';

    when 'floz' then return 'fl oz';
    when 'fl oz' then return 'fl oz';

    when 'gram' then return 'g';
    when 'grams' then return 'g';
    when 'g' then return 'g';

    when 'kilogram' then return 'kg';
    when 'kilograms' then return 'kg';
    when 'kg' then return 'kg';

    when 'ounce' then return 'oz';
    when 'ounces' then return 'oz';
    when 'oz' then return 'oz';

    when 'pound' then return 'lb';
    when 'pounds' then return 'lb';
    when 'lbs' then return 'lb';
    when 'lb' then return 'lb';

    when 'units' then return 'unit';
    when 'piece' then return 'unit';
    when 'pieces' then return 'unit';
    when 'pc' then return 'unit';
    when 'pcs' then return 'unit';
    when 'unit' then return 'unit';

    when 'cloves' then return 'clove';
    when 'clove' then return 'clove';

    when 'eggs' then return 'egg';
    when 'egg' then return 'egg';

    else return normalized;
  end case;
end;
$$;

create or replace function public.unit_dimension(input_unit text)
returns text
language sql
immutable
as $$
  select case public.unit_canonical(input_unit)
    when 'tsp' then 'volume'
    when 'tbsp' then 'volume'
    when 'cup' then 'volume'
    when 'ml' then 'volume'
    when 'l' then 'volume'
    when 'fl oz' then 'volume'
    when 'g' then 'weight'
    when 'kg' then 'weight'
    when 'oz' then 'weight'
    when 'lb' then 'weight'
    when 'unit' then 'count'
    when 'clove' then 'count'
    when 'egg' then 'count'
    else 'unknown'
  end;
$$;

create or replace function public.unit_to_base_factor(input_unit text)
returns numeric
language sql
immutable
as $$
  select case public.unit_canonical(input_unit)
    when 'tsp' then 4.92892
    when 'tbsp' then 14.7868
    when 'cup' then 240
    when 'ml' then 1
    when 'l' then 1000
    when 'fl oz' then 29.5735
    when 'g' then 1
    when 'kg' then 1000
    when 'oz' then 28.3495
    when 'lb' then 453.592
    else 1
  end;
$$;

create or replace function public.units_compatible(from_unit text, to_unit text)
returns boolean
language plpgsql
immutable
as $$
declare
  from_canonical text := public.unit_canonical(from_unit);
  to_canonical text := public.unit_canonical(to_unit);
  from_dimension text := public.unit_dimension(from_unit);
  to_dimension text := public.unit_dimension(to_unit);
begin
  if from_dimension = 'unknown' or to_dimension = 'unknown' then
    return from_canonical = to_canonical;
  end if;

  if from_dimension <> to_dimension then
    return false;
  end if;

  if from_dimension = 'count' then
    return from_canonical = to_canonical
      or from_canonical = 'unit'
      or to_canonical = 'unit';
  end if;

  return true;
end;
$$;

create or replace function public.convert_unit_qty(quantity numeric, from_unit text, to_unit text)
returns numeric
language plpgsql
immutable
as $$
declare
  from_canonical text := public.unit_canonical(from_unit);
  to_canonical text := public.unit_canonical(to_unit);
  base_value numeric;
begin
  if quantity is null then
    return null;
  end if;

  if not public.units_compatible(from_canonical, to_canonical) then
    return null;
  end if;

  if from_canonical = to_canonical then
    return quantity;
  end if;

  base_value := quantity * public.unit_to_base_factor(from_canonical);
  return base_value / public.unit_to_base_factor(to_canonical);
end;
$$;

create or replace function public.add_recipe_to_groceries(input_recipe_id uuid, input_target_servings numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  recipe_row record;
  ingredient_row record;
  candidate_row record;
  ingredient_count integer := 0;
  ratio numeric;
  incoming_qty numeric;
  incoming_unit text;
  matched_item_id uuid;
  matched_item_qty numeric;
  matched_item_unit text;
  converted_qty numeric;
  final_item_id uuid;
  final_item_unit text;
  contribution_qty numeric;
  source_row record;
begin
  if current_user is null then
    raise exception 'Unauthorized';
  end if;

  if input_target_servings is null or input_target_servings <= 0 then
    raise exception 'Target servings must be greater than zero.';
  end if;

  select r.id, r.household_id, r.title, r.servings
  into recipe_row
  from public.recipes r
  where r.id = input_recipe_id
    and public.is_household_member(r.household_id);

  if recipe_row.id is null then
    raise exception 'Recipe not found.';
  end if;

  if recipe_row.servings is null or recipe_row.servings <= 0 then
    raise exception 'Recipe servings must be greater than zero.';
  end if;

  ratio := input_target_servings / recipe_row.servings;

  for ingredient_row in
    select ri.id, ri.name_display, ri.name_normalized, ri.quantity, ri.unit
    from public.recipe_ingredients ri
    where ri.recipe_id = recipe_row.id
  loop
    ingredient_count := ingredient_count + 1;
    incoming_qty := round(ingredient_row.quantity * ratio, 3);
    incoming_unit := public.unit_canonical(ingredient_row.unit);

    matched_item_id := null;
    matched_item_qty := null;
    matched_item_unit := null;
    converted_qty := null;

    for candidate_row in
      select gi.id, gi.quantity, gi.unit
      from public.grocery_items gi
      where gi.household_id = recipe_row.household_id
        and gi.name_normalized = ingredient_row.name_normalized
        and gi.checked = false
        and gi.status = 'needed'
      order by gi.created_at asc
    loop
      converted_qty := public.convert_unit_qty(incoming_qty, incoming_unit, candidate_row.unit);
      if converted_qty is not null then
        matched_item_id := candidate_row.id;
        matched_item_qty := candidate_row.quantity;
        matched_item_unit := public.unit_canonical(candidate_row.unit);
        exit;
      end if;
    end loop;

    if matched_item_id is not null then
      final_item_id := matched_item_id;
      final_item_unit := matched_item_unit;
      contribution_qty := round(converted_qty, 3);

      update public.grocery_items
      set quantity = round(matched_item_qty + converted_qty, 3),
          name_display = ingredient_row.name_display,
          unit = matched_item_unit
      where id = matched_item_id;
    else
      final_item_unit := incoming_unit;
      contribution_qty := incoming_qty;

      insert into public.grocery_items (
        household_id,
        created_by,
        name_display,
        name_normalized,
        quantity,
        unit,
        category,
        status
      ) values (
        recipe_row.household_id,
        current_user,
        ingredient_row.name_display,
        ingredient_row.name_normalized,
        incoming_qty,
        incoming_unit,
        'recipe',
        'needed'
      )
      returning id into final_item_id;
    end if;

    select gis.id, gis.quantity_contributed
    into source_row
    from public.grocery_item_sources gis
    where gis.grocery_item_id = final_item_id
      and gis.source_type = 'recipe'
      and gis.source_id = recipe_row.id
      and gis.unit = final_item_unit
    order by gis.created_at desc
    limit 1;

    if source_row.id is not null then
      update public.grocery_item_sources
      set quantity_contributed = round(coalesce(source_row.quantity_contributed, 0) + coalesce(contribution_qty, 0), 3),
          unit = final_item_unit
      where id = source_row.id;
    else
      insert into public.grocery_item_sources (
        grocery_item_id,
        source_type,
        source_id,
        source_label,
        quantity_contributed,
        unit
      ) values (
        final_item_id,
        'recipe',
        recipe_row.id,
        recipe_row.title,
        round(contribution_qty, 3),
        final_item_unit
      );
    end if;
  end loop;

  return jsonb_build_object(
    'recipe_title', recipe_row.title,
    'ingredients_count', ingredient_count
  );
end;
$$;

grant execute on function public.add_recipe_to_groceries(uuid, numeric) to authenticated;

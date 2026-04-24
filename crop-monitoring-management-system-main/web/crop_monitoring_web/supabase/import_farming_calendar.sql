-- ============================================================================
-- IMPORT FARMING CALENDAR WORKBOOK
-- ============================================================================
-- Source workbook:
--   /home/dell/Downloads/Farming Calendar for database .xlsx
--
-- Sheets imported:
--   Plant  -> Zimbabwe Sugarcane Farmers' Calendar for Plant Cane
--   Ratoon -> Zimbabwe Sugarcane Farmers' Calendar for Ratoon Cane
--
-- Run this full script in the Supabase SQL Editor. It is safe to rerun: template,
-- note, and task rows are upserted with stable keys.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table if not exists public.farming_calendar_templates (
    id text primary key,
    title text not null,
    source_sheet text not null,
    workbook_title text not null,
    reference_label text not null,
    field_anchor text not null check (field_anchor in ('planting_date', 'cut_date')),
    anchor_week_number integer not null,
    month_start integer not null,
    month_end integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.farming_calendar_notes (
    id uuid primary key default gen_random_uuid(),
    template_id text not null references public.farming_calendar_templates(id) on delete cascade,
    note_order integer not null,
    note text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint farming_calendar_notes_template_order_unique unique (template_id, note_order)
);

create table if not exists public.farming_calendar_growth_stages (
    id uuid primary key default gen_random_uuid(),
    template_id text not null references public.farming_calendar_templates(id) on delete cascade,
    stage_key text not null,
    stage_order integer not null,
    title text not null,
    start_week integer not null,
    end_week integer not null,
    summary text not null,
    activity_focus text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint farming_calendar_growth_stages_template_key_unique unique (template_id, stage_key)
);

create table if not exists public.farming_calendar_tasks (
    id uuid primary key default gen_random_uuid(),
    template_id text not null references public.farming_calendar_templates(id) on delete cascade,
    task_key text not null,
    source_sheet text not null,
    source_row integer not null,
    source_column integer not null,
    month_number integer not null,
    week_number integer not null,
    week_label text not null,
    activity_type text not null default 'general',
    activity text not null,
    is_milestone boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint farming_calendar_tasks_template_key_unique unique (template_id, task_key)
);

create index if not exists idx_farming_calendar_notes_template
    on public.farming_calendar_notes(template_id, note_order);

create index if not exists idx_farming_calendar_growth_stages_template
    on public.farming_calendar_growth_stages(template_id, start_week, end_week);

create index if not exists idx_farming_calendar_tasks_template_week
    on public.farming_calendar_tasks(template_id, week_number);

create index if not exists idx_farming_calendar_tasks_template_month
    on public.farming_calendar_tasks(template_id, month_number);

-- ============================================================================
-- 2. UPDATED_AT TRIGGERS
-- ============================================================================

create or replace function public.update_farming_calendar_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_farming_calendar_templates_updated_at
    on public.farming_calendar_templates;
create trigger update_farming_calendar_templates_updated_at
    before update on public.farming_calendar_templates
    for each row
    execute function public.update_farming_calendar_updated_at();

drop trigger if exists update_farming_calendar_notes_updated_at
    on public.farming_calendar_notes;
create trigger update_farming_calendar_notes_updated_at
    before update on public.farming_calendar_notes
    for each row
    execute function public.update_farming_calendar_updated_at();

drop trigger if exists update_farming_calendar_growth_stages_updated_at
    on public.farming_calendar_growth_stages;
create trigger update_farming_calendar_growth_stages_updated_at
    before update on public.farming_calendar_growth_stages
    for each row
    execute function public.update_farming_calendar_updated_at();

drop trigger if exists update_farming_calendar_tasks_updated_at
    on public.farming_calendar_tasks;
create trigger update_farming_calendar_tasks_updated_at
    before update on public.farming_calendar_tasks
    for each row
    execute function public.update_farming_calendar_updated_at();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.farming_calendar_templates enable row level security;
alter table public.farming_calendar_notes enable row level security;
alter table public.farming_calendar_growth_stages enable row level security;
alter table public.farming_calendar_tasks enable row level security;

grant select on public.farming_calendar_templates to authenticated;
grant select on public.farming_calendar_notes to authenticated;
grant select on public.farming_calendar_growth_stages to authenticated;
grant select on public.farming_calendar_tasks to authenticated;

drop policy if exists "Approved users can read farming calendar templates"
    on public.farming_calendar_templates;
create policy "Approved users can read farming calendar templates"
    on public.farming_calendar_templates for select
    to authenticated
    using (true);

drop policy if exists "Approved users can read farming calendar notes"
    on public.farming_calendar_notes;
create policy "Approved users can read farming calendar notes"
    on public.farming_calendar_notes for select
    to authenticated
    using (true);

drop policy if exists "Approved users can read farming calendar growth stages"
    on public.farming_calendar_growth_stages;
create policy "Approved users can read farming calendar growth stages"
    on public.farming_calendar_growth_stages for select
    to authenticated
    using (true);

drop policy if exists "Approved users can read farming calendar tasks"
    on public.farming_calendar_tasks;
create policy "Approved users can read farming calendar tasks"
    on public.farming_calendar_tasks for select
    to authenticated
    using (true);

-- ============================================================================
-- 4. TEMPLATE ROWS
-- ============================================================================

insert into public.farming_calendar_templates (
    id,
    title,
    source_sheet,
    workbook_title,
    reference_label,
    field_anchor,
    anchor_week_number,
    month_start,
    month_end
)
values
    (
        'plant',
        'Plant Cane',
        'Plant',
        'Zimbabwe Sugarcane Farmers'' Calendar for Plant Cane',
        'Project start date',
        'planting_date',
        4,
        0,
        14
    ),
    (
        'ratoon',
        'Ratoon Cane',
        'Ratoon',
        'Zimbabwe Sugarcane Farmers'' Calendar for Ratoon Cane',
        'Cut date',
        'cut_date',
        1,
        1,
        12
    )
on conflict (id) do update
set
    title = excluded.title,
    source_sheet = excluded.source_sheet,
    workbook_title = excluded.workbook_title,
    reference_label = excluded.reference_label,
    field_anchor = excluded.field_anchor,
    anchor_week_number = excluded.anchor_week_number,
    month_start = excluded.month_start,
    month_end = excluded.month_end,
    updated_at = now();

-- ============================================================================
-- 5. NOTE ROWS
-- ============================================================================

insert into public.farming_calendar_notes (template_id, note_order, note)
values
    (
        'plant',
        1,
        'This calendar is for plant cane. There is a separate calendar for ratoon cane.'
    ),
    (
        'plant',
        2,
        'This calendar acts as a guide to help you track activities.'
    ),
    (
        'plant',
        3,
        'Irrigation should happen throughout the period; avoid over or under irrigating.'
    ),
    (
        'plant',
        4,
        'Timelines may differ slightly depending on season, on-farm conditions, and availability of resources.'
    ),
    (
        'plant',
        5,
        'Contact ZSAES scientists when in doubt.'
    ),
    (
        'plant',
        6,
        'For a list of certified seedcane providers, contact ZSAES Plant Pathology.'
    ),
    (
        'ratoon',
        1,
        'This calendar is for ratoon cane. There is a separate calendar for plant cane.'
    ),
    (
        'ratoon',
        2,
        'This calendar acts as a guide to help you track activities.'
    ),
    (
        'ratoon',
        3,
        'Irrigation should happen throughout the period; avoid over or under irrigating.'
    ),
    (
        'ratoon',
        4,
        'Timelines may differ slightly depending on season, on-farm conditions, and availability of resources.'
    ),
    (
        'ratoon',
        5,
        'Contact ZSAES scientists when in doubt.'
    )
on conflict (template_id, note_order) do update
set
    note = excluded.note,
    updated_at = now();

-- ============================================================================
-- 6. GROWTH STAGE ROWS
-- ============================================================================

insert into public.farming_calendar_growth_stages (
    template_id,
    stage_key,
    stage_order,
    title,
    start_week,
    end_week,
    summary,
    activity_focus
)
values
    (
        'plant',
        'plant-establishment',
        1,
        'Establishment',
        1,
        4,
        'Bud germination, emergence, and early stand establishment set the crop up for uniform growth.',
        array[
            'Keep irrigation even and watch emergence closely.',
            'Check stand establishment and early weed pressure.',
            'Prepare soil results and inputs before the first nutrient split.'
        ]
    ),
    (
        'plant',
        'plant-tillering',
        2,
        'Tillering',
        5,
        8,
        'The crop builds tillers and early canopy, so nutrient timing and weed control matter most here.',
        array[
            'Apply the early post-emergent herbicide.',
            'Apply the first and second nitrogen and potassium splits.',
            'Monitor tiller build-up and close any early growth gaps.'
        ]
    ),
    (
        'plant',
        'plant-grand-growth',
        3,
        'Grand Growth',
        9,
        16,
        'Rapid canopy expansion and stalk extension drive biomass accumulation in this phase.',
        array[
            'Apply the late nitrogen split where the calendar calls for it.',
            'Follow up with herbicide and hoeing where weeds remain active.',
            'Maintain stable irrigation to support vigorous cane growth.'
        ]
    ),
    (
        'plant',
        'plant-ripening',
        4,
        'Ripening and Maturity',
        17,
        60,
        'The crop shifts from bulk growth into ripening, field conditioning, and harvest readiness.',
        array[
            'Keep checking crop health and late stress signals.',
            'Balance irrigation carefully as the crop moves toward maturity.',
            'Plan harvest timing, access, and field logistics.'
        ]
    ),
    (
        'ratoon',
        'ratoon-recovery',
        1,
        'Shoot Recovery',
        1,
        4,
        'Fresh ratoon shoots recover from the cut and rebuild the stool for the next cycle.',
        array[
            'Check stool recovery and keep moisture steady after the cut.',
            'Follow up soil analysis results and confirm early nutrient needs.',
            'Keep the field clean while the ratoon stand is re-establishing.'
        ]
    ),
    (
        'ratoon',
        'ratoon-tillering',
        2,
        'Tillering',
        5,
        8,
        'Ratoon stools build productive tillers, so nutrition and early protection are the priorities.',
        array[
            'Apply the first and second nitrogen and potassium splits.',
            'Watch for uneven regrowth or nutrient deficiency across the stool.',
            'Protect the young canopy from weed competition.'
        ]
    ),
    (
        'ratoon',
        'ratoon-grand-growth',
        3,
        'Grand Growth',
        9,
        16,
        'The ratoon canopy expands fast and the crop pushes rapid stalk extension.',
        array[
            'Apply the late nitrogen split where it is still needed.',
            'Apply post-emergent herbicide and hoeing where weeds survive.',
            'Maintain irrigation to support fast cane growth.'
        ]
    ),
    (
        'ratoon',
        'ratoon-ripening',
        4,
        'Ripening and Harvest Prep',
        17,
        52,
        'The ratoon crop moves into ripening, field monitoring, and preparation for the next harvest cut.',
        array[
            'Monitor ripening progress and watch for lodging or stress.',
            'Balance irrigation with the expected harvest window.',
            'Prepare harvest timing, haulage access, and field readiness.'
        ]
    )
on conflict (template_id, stage_key) do update
set
    stage_order = excluded.stage_order,
    title = excluded.title,
    start_week = excluded.start_week,
    end_week = excluded.end_week,
    summary = excluded.summary,
    activity_focus = excluded.activity_focus,
    updated_at = now();

-- ============================================================================
-- 7. TASK ROWS
-- ============================================================================

insert into public.farming_calendar_tasks (
    template_id,
    task_key,
    source_sheet,
    source_row,
    source_column,
    month_number,
    week_number,
    week_label,
    activity_type,
    activity,
    is_milestone
)
values
    (
        'plant',
        'plant-month-00-planting',
        'Plant',
        6,
        4,
        0,
        4,
        'Planting',
        'anchor',
        'Planting',
        true
    ),
    (
        'plant',
        'plant-week-005-early-post-emergent-herbicide',
        'Plant',
        10,
        1,
        2,
        5,
        'Week 5',
        'herbicide',
        'Early post-emergent herbicide application',
        false
    ),
    (
        'plant',
        'plant-week-006-n-fertiliser-first-split',
        'Plant',
        10,
        2,
        2,
        6,
        'Week 6',
        'fertiliser',
        'N fertiliser (1st split). Application of K based on soil results.',
        false
    ),
    (
        'plant',
        'plant-week-008-n-fertiliser-second-split',
        'Plant',
        10,
        4,
        2,
        8,
        'Week 8',
        'fertiliser',
        'N fertiliser (2nd split). Application of K 2nd split.',
        false
    ),
    (
        'plant',
        'plant-week-013-post-emergent-herbicide-hoeing',
        'Plant',
        14,
        1,
        4,
        13,
        'Week 13',
        'herbicide',
        'Application of post-emergent herbicide and hoeing, depending on weed presence.',
        false
    ),
    (
        'plant',
        'plant-week-022-foliar-sampling',
        'Plant',
        18,
        2,
        6,
        22,
        'Week 22',
        'sampling',
        'Foliar sampling.',
        false
    ),
    (
        'plant',
        'plant-week-051-dry-off',
        'Plant',
        30,
        7,
        13,
        51,
        'Week 51',
        'irrigation',
        'Dry off will depend on TAM.',
        false
    ),
    (
        'plant',
        'plant-week-052-maturity-test',
        'Plant',
        30,
        8,
        13,
        52,
        'Week 52',
        'maturity',
        'Maturity test.',
        false
    ),
    (
        'ratoon',
        'ratoon-week-001-soil-sampling',
        'Ratoon',
        6,
        1,
        1,
        1,
        'Week 1',
        'sampling',
        'Soil sampling soon after cutback.',
        false
    ),
    (
        'ratoon',
        'ratoon-week-002-soil-analysis-ssp-map',
        'Ratoon',
        6,
        2,
        1,
        2,
        'Week 2',
        'fertiliser',
        'Follow up on soil analysis results. Application of SSP or MAP.',
        false
    ),
    (
        'ratoon',
        'ratoon-week-006-n-fertiliser-first-split',
        'Ratoon',
        6,
        6,
        2,
        6,
        'Week 6',
        'fertiliser',
        'N fertiliser application (1st split). Application of K fertiliser based on soil results (1st split).',
        false
    ),
    (
        'ratoon',
        'ratoon-week-008-n-fertiliser-second-split',
        'Ratoon',
        6,
        8,
        2,
        8,
        'Week 8',
        'fertiliser',
        'N fertiliser application (2nd split). Application of K fertiliser based on soil results (2nd split).',
        false
    ),
    (
        'ratoon',
        'ratoon-week-013-post-emergent-herbicide-hoeing',
        'Ratoon',
        14,
        1,
        5,
        13,
        'Week 13',
        'herbicide',
        'Application of post-emergent herbicide and hoeing, depending on weed presence.',
        false
    ),
    (
        'ratoon',
        'ratoon-week-022-foliar-sampling',
        'Ratoon',
        18,
        2,
        7,
        22,
        'Week 22',
        'sampling',
        'Foliar sampling.',
        false
    ),
    (
        'ratoon',
        'ratoon-week-047-dry-off',
        'Ratoon',
        26,
        3,
        11,
        47,
        'Week 47',
        'irrigation',
        'Dry off will depend on TAM.',
        false
    )
on conflict (template_id, task_key) do update
set
    source_sheet = excluded.source_sheet,
    source_row = excluded.source_row,
    source_column = excluded.source_column,
    month_number = excluded.month_number,
    week_number = excluded.week_number,
    week_label = excluded.week_label,
    activity_type = excluded.activity_type,
    activity = excluded.activity,
    is_milestone = excluded.is_milestone,
    updated_at = now();

commit;

-- Ask Supabase/PostgREST to refresh its schema cache so the new calendar tables
-- are immediately available to supabase-js queries.
notify pgrst, 'reload schema';

-- ============================================================================
-- 8. VERIFY IMPORT
-- ============================================================================

select
    t.id as template_id,
    t.title,
    count(distinct n.id) as note_count,
    count(distinct g.id) as growth_stage_count,
    count(distinct task.id) as task_count,
    min(task.week_number) as first_week,
    max(task.week_number) as last_week
from public.farming_calendar_templates t
left join public.farming_calendar_notes n
    on n.template_id = t.id
left join public.farming_calendar_growth_stages g
    on g.template_id = t.id
left join public.farming_calendar_tasks task
    on task.template_id = t.id
group by t.id, t.title
order by t.id;

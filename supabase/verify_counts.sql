SELECT 
    table_name,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as approximate_row_count
FROM (
    SELECT 
        table_name,
        query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) t
ORDER BY table_name;
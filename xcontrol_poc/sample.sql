select "ID", "CL", "STDDEV", "DATAPOINT", "LABEL",
       "DATAPOINT"*0.3+0.1 as "DATAPOINT2",
       "DATAPOINT"*0.3-0.1 as "DATAPOINT3"
from (
select 1 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.794895397 as "DATAPOINT", 'REQ-PTN-004' as "LABEL"
union all
select 2 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.0998998 as "DATAPOINT", 'REQ-AUH-008' as "LABEL"
union all
select 3 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.06039801 as "DATAPOINT", 'REQ-PTN-002' as "LABEL"
union all
select 4 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 1.027027027 as "DATAPOINT", 'REQ-TNR-006' as "LABEL"
union all
select 5 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.210820896 as "DATAPOINT", 'REQ-TNR-005' as "LABEL"
union all
select 6 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.056066176 as "DATAPOINT", 'REQ-TNR-001' as "LABEL"
union all
select 7 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.032338308 as "DATAPOINT", 'REQ-ADM-006' as "LABEL"
union all
select 8 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.011850312 as "DATAPOINT", 'REQ-ADM-017' as "LABEL"
union all
select 9 as "ID", 0.126401 as "CL", 0.092218 as "STDDEV", 0.025 as "DATAPOINT", 'REQ-KNS-001'
) XCONTROL_POC
order by "ID";
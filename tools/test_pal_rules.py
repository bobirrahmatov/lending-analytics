"""Explicit PAL boundary fixtures, independent expected results. No browser ETL."""
import unittest,copy,json
from pathlib import Path
from pal_contract import prepare, monitoring, EXCLUDED
P=Path(__file__).resolve().parents[1]
base=json.loads((P/'attachments/credit-portfolio-demo-20261023.json').read_text())['rows'][0]
class PALRules(unittest.TestCase):
 def row(self,**kw):
  r=copy.deepcopy(base);r.update(region='NAM',management_status='CM',ca_review='Yes',pse=False,product='Securities Based Lending',direct_os=100,loan_spread=70,pricing_exception='Yes',facility_type='Term Loan',origination_date=None,renewal_date=None,facility_first_approval_date='2026-08-01',ca_expiration_date='2026-08-30',maturity_date='2026-08-31',as_of_date='2026-08-31');r.update(kw);prepare([r]);return r
 def test_ca_management_review_and_boundaries(self):
  self.assertTrue(self.row()['pal_ca_expired'])
  self.assertFalse(self.row(management_status='DM')['pal_ca_expired'])
  self.assertFalse(self.row(region='EMEA',ca_review='No')['pal_ca_expired'])
  self.assertTrue(self.row(region='EMEA')['pal_ca_expired'])
  self.assertFalse(self.row(ca_expiration_date='2026-08-31')['pal_ca_expired'])
  self.assertEqual(self.row(ca_expiration_date='2026-10-31')['pal_ca_month'],'2026-10')
  self.assertIsNone(self.row(ca_expiration_date='2026-11-01')['pal_ca_month'])
 def test_facility_includes_dm_and_demand(self):
  self.assertTrue(self.row(management_status='DM',maturity_date='2026-08-30')['pal_facility_expired'])
  self.assertEqual(self.row()['pal_facility_month'],'2026-08')
  self.assertFalse(self.row(maturity_date=None)['pal_facility_expired'])
 def test_approval_date_region_year_rollover(self):
  self.assertEqual(self.row()['pal_approval_period'],'CURRENT')
  self.assertIsNone(self.row(region='APAC')['pal_approval_period'])
  self.assertEqual(self.row(as_of_date='2026-01-31',facility_first_approval_date='2025-12-15')['pal_approval_period'],'PREVIOUS')
 def test_pipeline_thresholds_exclusions(self):
  for date,bucket in [('2026-08-01','1-30'),('2026-07-31','31-60'),('2026-07-01','61-90'),('2026-05-31','>90')]:self.assertEqual(self.row(facility_first_approval_date=date)['pal_pipeline_bucket'],bucket)
  for typ in EXCLUDED:self.assertIsNone(self.row(facility_type=typ)['pal_pipeline_bucket'])
  for kw in [dict(origination_date='2026-08-20'),dict(pse=True),dict(region='EMEA'),dict(facility_first_approval_date='2025-12-31'),dict(facility_first_approval_date='2026-08-31')]:self.assertIsNone(self.row(**kw)['pal_pipeline_bucket'])
 def test_spreads(self):
  for n,b in [(70,'<=70'),(70.01,'70-125'),(125,'70-125'),(125.01,'>125')]:self.assertEqual(self.row(loan_spread=n)['pal_spread_bucket'],b)
  self.assertEqual(self.row()['pal_spread_weight'],7000)
  self.assertEqual(self.row(loan_spread=None)['pal_spread_os'],0)
  self.assertIsNone(self.row(direct_os=0)['pal_spread_bucket'])
 def test_prior_period_clamps(self):
  self.assertTrue(self.row(as_of_date='2024-02-29',origination_date='2023-02-28')['pal_prior_ytd'])
  self.assertFalse(self.row(as_of_date='2024-02-29',origination_date='2023-03-01')['pal_prior_ytd'])
  self.assertTrue(self.row(as_of_date='2026-03-31',origination_date='2026-02-28')['pal_prior_mtd'])
 def test_four_periods_and_quarter_boundary(self):
  r=self.row(as_of_date='2026-04-01',origination_date='2026-03-31')
  self.assertTrue(r['pal_new_ytd']);self.assertFalse(r['pal_new_qtd']);self.assertFalse(r['pal_new_mtd']);self.assertTrue(r['pal_new_wtd'])
  self.assertTrue(self.row(as_of_date='2026-04-01',origination_date='2026-01-01')['pal_prior_qtd'])
  self.assertFalse(self.row(as_of_date='2026-04-01',origination_date='2026-01-02')['pal_prior_qtd'])
  self.assertTrue(self.row(as_of_date='2026-01-01',origination_date='2025-10-01')['pal_prior_qtd'])
 def test_week_monday_and_prior_elapsed_days(self):
  self.assertTrue(self.row(origination_date='2026-08-31')['pal_new_wtd'])
  self.assertFalse(self.row(origination_date='2026-08-30')['pal_new_wtd'])
  self.assertTrue(self.row(origination_date='2026-08-24')['pal_prior_wtd'])
  self.assertFalse(self.row(origination_date='2026-08-25')['pal_prior_wtd'])
  self.assertTrue(self.row(as_of_date='2026-09-04',origination_date='2026-08-28')['pal_prior_wtd'])
 def test_period_eligibility_and_future_dates(self):
  self.assertFalse(self.row(origination_date='2026-09-01')['pal_new_ytd'])
  self.assertFalse(self.row(origination_date='2026-08-31',pse=True)['pal_new_wtd'])
  self.assertTrue(self.row(origination_date=None,renewal_date='2026-08-31')['pal_new_wtd'])
  self.assertFalse(self.row(region='APAC')['pal_approved_ytd'])
  self.assertFalse(self.row(facility_first_approval_date='2026-09-01')['pal_approved_ytd'])
  self.assertTrue(self.row()['pal_pending_qtd']);self.assertFalse(self.row()['pal_pending_wtd'])
 def test_covenants(self):
  for days,b in [(45,'1-45'),(46,'46-90'),(90,'46-90'),(91,'>90')]:
   r=dict(category='COVENANTS',status='PAST_DUE',days_past_due=days,effective_due_date='2026-07-01',as_of_date='2026-08-31');monitoring([r]);self.assertEqual(r['pal_covenant_bucket'],b)
  for due,expected in [('2026-08-31',True),('2026-09-30',True),('2026-10-01',False)]:
   r=dict(category='COVENANTS',status='COMING_DUE',days_past_due=0,effective_due_date=due,as_of_date='2026-08-31');monitoring([r]);self.assertEqual(r['pal_due30'],expected)
  r.update(status='CLEARED');monitoring([r]);self.assertIsNone(r['pal_covenant_bucket']);self.assertFalse(r['pal_due30'])
if __name__=='__main__':unittest.main(verbosity=2)

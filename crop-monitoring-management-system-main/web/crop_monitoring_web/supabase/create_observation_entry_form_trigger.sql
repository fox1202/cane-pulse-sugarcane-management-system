-- Create the trigger function for observation_entry_form updated_at
CREATE OR REPLACE FUNCTION set_observation_entry_form_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
CREATE TRIGGER trg_observation_entry_form_updated_at
BEFORE UPDATE ON observation_entry_form
FOR EACH ROW
EXECUTE FUNCTION set_observation_entry_form_updated_at();

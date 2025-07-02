
-- Create table for shift swap requests
CREATE TABLE public.shift_swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  to_employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  from_shift_date DATE NOT NULL,
  from_shift_type TEXT NOT NULL,
  to_shift_date DATE NOT NULL,
  to_shift_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for shift swap requests
CREATE POLICY "Users can view swap requests they are involved in" 
  ON public.shift_swap_requests 
  FOR SELECT 
  USING (true); -- For now, allow all authenticated users to see all requests

CREATE POLICY "Users can create swap requests" 
  ON public.shift_swap_requests 
  FOR INSERT 
  WITH CHECK (true); -- For now, allow all authenticated users to create requests

CREATE POLICY "Users can update swap requests they received" 
  ON public.shift_swap_requests 
  FOR UPDATE 
  USING (true); -- For now, allow all authenticated users to update requests

-- Add index for better performance
CREATE INDEX idx_shift_swap_requests_from_employee ON public.shift_swap_requests(from_employee_id);
CREATE INDEX idx_shift_swap_requests_to_employee ON public.shift_swap_requests(to_employee_id);
CREATE INDEX idx_shift_swap_requests_status ON public.shift_swap_requests(status);

-- Create table for actual shift assignments
CREATE TABLE public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  shift_type TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_by TEXT NOT NULL DEFAULT 'auto' CHECK (assigned_by IN ('auto', 'manual', 'swap')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(employee_id, date, shift_type)
);

-- Enable RLS for shift assignments
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for shift assignments
CREATE POLICY "Users can view all shift assignments" 
  ON public.shift_assignments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create shift assignments" 
  ON public.shift_assignments 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update shift assignments" 
  ON public.shift_assignments 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete shift assignments" 
  ON public.shift_assignments 
  FOR DELETE 
  USING (true);

-- Add indexes for better performance
CREATE INDEX idx_shift_assignments_employee ON public.shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_date ON public.shift_assignments(date);
CREATE INDEX idx_shift_assignments_shift_type ON public.shift_assignments(shift_type);

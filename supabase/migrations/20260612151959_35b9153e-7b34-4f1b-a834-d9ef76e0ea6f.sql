CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND user_id = auth.uid()
  );
END;
$function$;
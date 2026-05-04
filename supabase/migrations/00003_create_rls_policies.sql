-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- Public view for profiles (for referral display)
CREATE VIEW public_profiles AS
  SELECT id, username, referral_code, created_at FROM profiles;

-- Wallets policies
CREATE POLICY "Admins have full access to wallets" ON wallets
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own wallets" ON wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Admins have full access to transactions" ON transactions
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Deposits policies
CREATE POLICY "Admins have full access to deposits" ON deposits
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own deposits" ON deposits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits" ON deposits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Withdrawals policies
CREATE POLICY "Admins have full access to withdrawals" ON withdrawals
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own withdrawals" ON withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals" ON withdrawals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Referral commissions policies
CREATE POLICY "Admins have full access to referral commissions" ON referral_commissions
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own referral commissions" ON referral_commissions
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

-- ROI records policies
CREATE POLICY "Admins have full access to roi records" ON roi_records
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own roi records" ON roi_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Support tickets policies
CREATE POLICY "Admins have full access to support tickets" ON support_tickets
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own support tickets" ON support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own support tickets" ON support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets" ON support_tickets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Ticket replies policies
CREATE POLICY "Admins have full access to ticket replies" ON ticket_replies
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view replies to their tickets" ON ticket_replies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_replies.ticket_id AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create replies to their tickets" ON ticket_replies
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_replies.ticket_id AND st.user_id = auth.uid()
    )
  );

-- Content pages policies
CREATE POLICY "Everyone can view content pages" ON content_pages
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage content pages" ON content_pages
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Activity logs policies
CREATE POLICY "Admins have full access to activity logs" ON activity_logs
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs" ON activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
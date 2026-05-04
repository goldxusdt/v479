DROP TRIGGER IF EXISTS tr_coupon_auto_delete ON coupons;
CREATE TRIGGER tr_coupon_auto_delete
BEFORE UPDATE ON coupons
FOR EACH ROW
EXECUTE FUNCTION check_coupon_auto_delete();

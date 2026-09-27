package dev.worldcombat.core.runtime;

import java.util.*;

/** Neutral target identities and decisions; no game bootstrap. */
public final class TargetLeaseChecks {
    private static int checks;
    private static void require(boolean value, String label) { if (!value) throw new AssertionError(label); checks++; }
    private static final class Port implements TargetLeaseTable.Port<String, String> {
        final Map<String, String> values = new HashMap<>();
        final Set<String> invalid = new HashSet<>(), friendly = new HashSet<>();
        boolean refuse; int writes;
        public boolean valid(String actor) { return !invalid.contains(actor); }
        public String current(String actor) { return values.get(actor); }
        public boolean restorable(String actor, String target) { return !invalid.contains(target) && !friendly.contains(target); }
        public boolean request(String actor, String target) {
            writes++; if (refuse) return false;
            values.put(actor, target); return true;
        }
    }
    public static void main(String[] args) {
        var p = new Port(); var book = new TargetLeaseTable<String, String>(p);
        p.values.put("body", "old");
        p.refuse = true;
        require(!book.acquire(1, "body", null, 20, 0) && book.view("body", 0) == null && "old".equals(p.current("body")), "refused calm does not acquire");
        p.values.put("body", null);
        require(!book.acquire(1, "body", null, 20, 0), "refused null-to-null is not accepted by equality");
        p.refuse = false; p.values.put("body", "old");
        require(book.acquire(1, "body", null, 20, 0) && book.requested("body", "enemy", 19) == null, "calm filters every request inside finite window");
        p.values.put("body", null); book.nativeRequest("body", true);
        require(book.view("body", 1).active(), "accepted native clear maintains calm");
        require("enemy".equals(book.requested("body", "enemy", 20)), "expired calm no longer filters before cleanup");
        book.tick(20);
        require("old".equals(p.current("body")) && book.view("body", 20) == null, "expiry restores accepted prior target");
        require(!book.acquire(1, "body", null, 20, 21), "expired owner cannot reacquire in same lifetime");
        book.releaseOwner(1);
        require(book.acquire(2, "body", "caller", 30, 21), "redirect accepts once");
        int writes = p.writes;
        require(book.acquire(2, "body", "caller", 40, 22) && p.writes == writes, "live renewal does not replay native request");
        book.nativeRequest("body", false);
        require(book.view("body", 22).active(), "rejected external request does not steal ownership");
        book.nativeRequest("body", true);
        require(book.view("body", 22) == null && !book.acquire(2, "body", "caller", 30, 23), "accepted same-target request takes ownership");
        book.releaseOwner(2); require("caller".equals(p.current("body")), "ending old owner leaves external target intact");
        p.values.put("body", "old"); require(book.acquire(3, "body", "first", 50, 25), "first lease");
        require(book.acquire(4, "body", "second", 50, 26), "later owner replaces accepted lease");
        book.releaseOwner(3); require("second".equals(p.current("body")), "older release cannot clear newer redirect");
        require(book.release(4, "body") && "old".equals(p.current("body")), "newest release restores original baseline rather than retired lease");
        book.releaseOwner(4);
        require(book.acquire(5, "body", "caller", 50, 30), "lease for native override");
        p.values.put("body", "external"); book.nativeRequest("body", true); book.releaseOwner(5);
        require("external".equals(p.current("body")), "accepted new target survives ending");
        require(book.acquire(6, "body", null, 50, 30), "calm for event rewrite");
        p.values.put("body", "event-choice"); book.nativeRequest("body", true);
        require(book.view("body", 31) == null && !book.acquire(6, "body", null, 50, 31), "native event rewrite releases calm and prevents retry theft");
        book.releaseOwner(6); p.values.put("body", "former-friend");
        require(book.acquire(7, "body", "caller", 50, 40), "lease before relationship changes");
        p.friendly.add("former-friend"); book.releaseOwner(7);
        require(p.current("body") == null, "friendship change prevents restoring hostile target");
        p.values.put("body", "old"); require(book.acquire(8, "body", "caller", 50, 40), "lease before native restoration refusal");
        p.refuse = true; book.releaseOwner(8);
        require("caller".equals(p.current("body")) && book.view("body", 41) == null, "restoration respects native refusal and retires ownership");
        p.refuse = false; require(book.acquire(9, "body", "desired", 50, 40), "lease before bypass write");
        p.values.put("body", "bypass"); book.tick(41);
        require(book.view("body", 41) == null && "bypass".equals(p.current("body")), "out-of-band target is observed without rollback");
        System.out.println("PASS TargetLeaseChecks: " + checks + " assertions");
    }
}

package dev.worldcombat.core.runtime;

import java.util.Map;
import static dev.worldcombat.core.runtime.RuntimeChecks.*;

public final class InputReleaseChecks {
    private static final String SPEC = "{\"input\":{\"version\":1,\"steps\":[\"point\"],\"sustained\":true}}";
    private static final String INPUT = "{\"version\":1,\"token\":17,\"samples\":[{\"kind\":\"point\",\"point\":[2,0,0]}]}";
    private static void start(Fixture f) {
        f.runtime.start(ACTION, f.actor, ActionTarget.entity(f.target, new Point(2,0,0),new Point(1,0,0)),null,Map.of(ActionInput.KEY,INPUT));
    }
    public static void run() {
        scenario("opt-in input release keeps final aim and paid aftermath while explicit cancellation stays immediate", () -> {
            int[] fired = {0};
            var f = new Fixture(action -> action.on("world_combat:input-release", current -> {
                check(current.control().contains("[4,0,0]"), "Release lost final sample");
                fired[0]++; current.commit(1); current.after(30, ActionContext::finish);
            }), SPEC);
            start(f);
            check(!f.runtime.releaseInput(f.actor,null,16,INPUT), "Stale release token accepted");
            check(f.runtime.releaseInput(f.actor,null,17,INPUT.replace("[2,0,0]","[4,0,0]")), "Physical release refused");
            check(!f.runtime.releaseInput(f.actor,null,17,INPUT) && fired[0] == 1 && f.host.commitments == 1, "Release repeated payment or fire");
            check(f.runtime.inputToken(f.actor,null) == 0, "Released action still requested client heartbeats");
            for(int i=0;i<20;i++) f.runtime.tick();
            check(f.runtime.stats().instances() == 1, "Released aftermath timed out");
            for(int i=0;i<11;i++) f.runtime.tick(); f.empty();
            var cancelled = new Fixture(action -> action.on("world_combat:input-release", current -> fired[0]++), SPEC);
            start(cancelled); cancelled.runtime.control(cancelled.actor,null,17,INPUT,true);
            check(fired[0] == 1 && cancelled.host.commitments == 0, "Explicit cancellation became fire"); cancelled.empty();
            var ordinary = new Fixture(action -> {}, SPEC); start(ordinary);
            ordinary.runtime.releaseInput(ordinary.actor,null,17,INPUT); ordinary.empty();
            var early = new Fixture(action -> action.on("world_combat:input-release", current -> current.reject("checks:not-ready")),SPEC);
            start(early); early.runtime.releaseInput(early.actor,null,17,INPUT);
            check(early.host.commitments == 0,"Early refused release paid"); early.empty();
        });
    }
}

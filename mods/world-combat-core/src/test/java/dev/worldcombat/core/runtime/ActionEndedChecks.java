package dev.worldcombat.core.runtime;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.*;
import static dev.worldcombat.core.runtime.RuntimeChecks.*;

/** Termination facts stay readable after ownership and actor availability end. */
public final class ActionEndedChecks {
    public static void run() {
        scenario("action endings release ownership once and identify each exact instance", () -> {
            var host = new Host(); var content = new ContentRegistry(); var runtime = new ActionRuntime(host, content);
            var actor = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
            host.actors.addAll(List.of(actor, target)); host.target = target;
            var actions = new HashMap<Long, ActionContext>(); var facts = new LinkedHashMap<Long, JsonObject>();
            var released = new HashSet<Long>(); var currentRecord = new HashMap<String, Long>();
            content.begin();
            content.register(content.epoch(), "checks:held", "1", 100, action -> {
                actions.put(action.id(), action); currentRecord.put(actor.ref(), action.id());
                host.lease(action.id(), () -> released.add(action.id()));
                action.on("checks:unused", next -> {}); action.after(40, next -> {});
            });
            content.composition(content.epoch(), "checks:held", "{\"mode\":\"parallel\",\"claims\":[]}");
            content.hooks().register(content.epoch(), "checks:ended", "world_combat:action_ended", "", event -> {
                var data = JsonParser.parseString(event.data()).getAsJsonObject(); var id = data.get("instance").getAsLong();
                check(event.action() == null && released.contains(id) && !runtime.instances.containsKey(id), "Ending preceded resource cleanup");
                check(actions.get(id).tasks.isEmpty() && actions.get(id).listeners.isEmpty(), "Ending retained owned timers or listeners");
                check(facts.putIfAbsent(id, data) == null && data.get("content").getAsString().equals("checks:held"), "Ending duplicated or changed identity");
                rejected(() -> event.world().health(actor, 1, "checks:ended"));
                if (Objects.equals(currentRecord.get(actor.ref()), id)) currentRecord.remove(actor.ref());
            });
            content.complete(true); runtime.reset("content-reloaded");
            long first = runtime.start("checks:held", actor, target, null), next = runtime.start("checks:held", actor, target, null);
            actions.get(first).cancel(); runtime.finish(actions.get(first), "duplicate");
            check(facts.size() == 1 && facts.get(first).get("reason").getAsString().equals("cancelled")
                && currentRecord.get(actor.ref()) == next && !facts.get(first).get("committed").getAsBoolean(), "Old ending removed a newer action record");
            actions.get(next).commit(0); actions.get(next).finish();
            check(facts.size() == 2 && facts.get(next).get("committed").getAsBoolean()
                && facts.get(next).get("reason").getAsString().equals("finished"), "Committed finish facts were lost");
            long parent = runtime.start("checks:held", actor, target, null); actions.get(parent).commit(0);
            var child = actions.get(parent).child("checks:held", target, new Point(2, 0, 0), new Point(0, 0, 1), "{}", "linked");
            check(child.accepted(), "Linked child fixture was refused"); actions.get(parent).finish();
            check(facts.size() == 4 && facts.get(child.instance()).get("reason").getAsString().equals("parent-ended"), "Linked ending lost child identity");
            long leaving = runtime.start("checks:held", actor, target, null); host.actors.remove(actor); runtime.tick();
            check(facts.size() == 5 && facts.containsKey(leaving) && currentRecord.isEmpty() && runtime.stats().listeners() == 0
                && host.errors == 0, "Actor departure prevented read-only ending cleanup");
        });
    }
}

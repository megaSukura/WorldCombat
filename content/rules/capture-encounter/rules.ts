NativeCapture.rules.define({ id: "world_combat:capture_encounter", apply: context => {
    var event = context.event, now = event.tick(), first = event.number("first"), last = event.number("last");
    if (!isFinite(first) || !isFinite(last) || now - last > 600) { first = now; event.setNumber("fought", 0); }
    event.setNumber("first", first); event.setNumber("last", now);
    if (event.kind() !== "capture") event.setNumber("fought", 1);
    context.data.age = now - first; context.data.fought = event.number("fought") === 1;
} });

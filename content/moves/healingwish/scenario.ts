Smoke.scenario("healingwish", function (stage) {
    stage.time("night");
    const caster = stage.pokemon({ species: "gardevoir", level: 55, moves: ["healingwish"], at: [0, 0, 0] });
    const refused = stage.pokemon({ species: "gardevoir", level: 55, moves: ["healingwish"], at: [18, 0, 0] });
    const ally = stage.mob({ type: "minecraft:villager", at: [1, 0, 0] });
    const healthy = stage.mob({ type: "minecraft:villager", at: [.4, 0, .4] });
    const refusedAlly = stage.mob({ type: "minecraft:villager", at: [19, 0, 0] });
    stage.noai(ally, healthy, refusedAlly);
    stage.team("wish_paid", [caster, ally, healthy]); stage.team("wish_refused", [refused, refusedAlly]);
    stage.after(20, function () {
    stage.hurt(ally, ally.health() * .65, "minecraft:magic", { source: refused });
    stage.hurt(refusedAlly, refusedAlly.health() * .65, "minecraft:magic", { source: caster });
    stage.hurt(caster, caster.health() * .86, "minecraft:magic", { source: refused });
    stage.hurt(refused, refused.health() * .86, "minecraft:magic", { source: caster });
    stage.command("data merge entity " + refused.ref.split("/")[0] + " {Invulnerable:1b}");
    const wounded = ally.health(), denied = refusedAlly.health(), full = healthy.health();
    stage.until(900, () => stage.casts("healingwish", caster) > 0 && !caster.alive()
        && ally.health() > wounded && stage.casts("healingwish", refused) > 0, function () {
        stage.after(24, function () {
            stage.expect(!caster.alive(), "a confirmed sacrifice activates the wish");
            stage.expect(ally.health() > wounded, "the actual injured ally receives the one wish");
            stage.expect(healthy.health() === full, "the nearer healthy ally does not consume the wish");
            stage.expect(refused.alive(), "the refused payer remains alive");
            stage.expect(refusedAlly.health() === denied, "a denied sacrifice grants no healing");
            stage.note("The star sits at a native top-face support point and consumes only on actual healing or cleansing.");
            stage.done();
        });
    }, "one confirmed wish heals while denied payment leaves no benefit");
    });
});

namespace ReflecttypeReviewScenario {
    var casterRef = "", defenderRef = "", denyRefresh = false, refusals = 0;
    var mirrored = "", restored = "";
    WorldCombat.on("checks:reflecttype/type-added", "world_combat:mob_effect_added", "", function (event) {
        if (String(event.actor().ref()).indexOf(casterRef) !== 0 || PokemonSkills.reflecttypeCarriers.indexOf(JSON.parse(event.data()).id) < 0) return;
        var world = event.world(), actor = event.actor();
        mirrored = PokemonSkills.reflecttypeRead(world, actor).join(",");
    });
    WorldCombat.on("checks:reflecttype/type-removed", "world_combat:mob_effect_removed", "", function (event) {
        if (String(event.actor().ref()).indexOf(casterRef) !== 0 || PokemonSkills.reflecttypeCarriers.indexOf(JSON.parse(event.data()).id) < 0) return;
        restored = PokemonSkills.reflecttypeRead(event.world(), event.actor()).join(",");
    });
    WorldCombat.on("checks:reflecttype/replacement-veto", "world_combat:mob_effect_incoming", "", event => {
        const target = event.target(), data = JSON.parse(event.data());
        if (denyRefresh && target && String(target.ref()).indexOf(defenderRef) === 0 && data.id === "world_combat:reflecttype_alternate") {
            refusals++; event.reject("checks:replacement-veto");
        }
    });
/** Native type and ordinary armour branches, each restored by clearing its own carrier. */
Smoke.scenario("reflecttype", function (stage) {
    stage.fill([-12, -1, -6], [12, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Staryu", level: 40, moves: ["reflecttype"], at: [-7, 0, 0] });
    var target = stage.pokemon({ species: "Pikachu", level: 24, moves: [], at: [-3, 0, 0] });
    var defender = stage.pokemon({ species: "Staryu", level: 40, moves: ["reflecttype"], at: [5, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:husk", at: [8, 0, 0] });
    stage.noai(zombie);
    stage.command("item replace entity " + zombie.ref.split("/")[0] + " armor.chest with minecraft:diamond_chestplate");
    var armourBefore = stage.attribute(defender, "minecraft:generic.armor");
    casterRef = caster.ref; defenderRef = defender.ref; mirrored = ""; restored = ""; denyRefresh = false; refusals = 0;
    stage.after(3, function () { stage.provoke(caster, target); stage.provoke(defender, zombie); });
    stage.until(1000, function () {
        return mirrored === "electric" && stage.hasMobEffect(defender, "world_combat:reflecttype")
            && stage.attribute(defender, "minecraft:generic.armor") > armourBefore + .5;
    }, function () {
        stage.expect(mirrored === "electric", "the native branch reads the copied electric type");
        stage.expect(stage.casts("reflecttype", defender) > 0, "ordinary enemy armour is a valid AI benefit");
        stage.expect(Math.abs(stage.attribute(defender, "minecraft:generic.armor") - stage.attribute(zombie, "minecraft:generic.armor")) < .01,
            "the ordinary branch copied real armour");
        stage.setPp(caster, "reflecttype", 0);
        const copied = stage.attribute(defender, "minecraft:generic.armor");
        denyRefresh = true;
        stage.command("item replace entity " + zombie.ref.split("/")[0] + " armor.legs with minecraft:diamond_leggings");
        stage.until(300, () => refusals > 0, function () {
            stage.expect(Math.abs(stage.attribute(defender, "minecraft:generic.armor") - copied) < .01
                && stage.hasMobEffect(defender, "world_combat:reflecttype"), "a real native carrier veto preserves the previous copy and carrier");
            denyRefresh = false;
            stage.until(350, () => Math.abs(stage.attribute(defender, "minecraft:generic.armor") - stage.attribute(zombie, "minecraft:generic.armor")) < .01, function () {
                stage.expect(stage.hasMobEffect(defender, "world_combat:status/reflecttype"), "successful replacement has one live native identity");
                stage.setPp(defender, "reflecttype", 0);
                PokemonSkills.reflecttypeCarriers.forEach(id => {
                    stage.command("effect clear " + caster.ref.split("/")[0] + " " + id);
                    stage.command("effect clear " + defender.ref.split("/")[0] + " " + id);
                });
                stage.after(8, function () {
                    stage.expect(restored === "water", "clearing the carrier restores the original native type");
                    stage.expect(Math.abs(stage.attribute(defender, "minecraft:generic.armor") - armourBefore) < .01, "clearing the carrier restores the original armour");
                    stage.note("Actual type/armour application, refused replacement preservation, accepted source replacement and carrier cleanup verified. Mirror appearance and Mod renderer diversity remain playtest observations.");
                    stage.done();
                });
            }, "a later accepted replacement copies the improved armour");
        }, "the native new-carrier gate actually refused a replacement");
    }, "both real copy branches are active");
});

}

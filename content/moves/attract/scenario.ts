// 迷人：异性宝可梦之间的一次飞吻软控。飞吻会缓慢追踪，开阔平地上几乎必中；着迷只让目标心软、不拖拽，
// 所以断言“放出来了”“目标着了迷”两件必然事实，随机的心软次数与目标有没有被拽动都留给轨迹读取。
Smoke.scenario("attract", function (stage) {
    const caster = stage.pokemon({ species: "pikachu", level: 41, moves: ["attract"], at: [-2, 0, 0], properties: "gender=female" });
    const target = stage.pokemon({ species: "raichu", level: 30, moves: [], at: [2, 0, 0], properties: "gender=male" });
    stage.hostile(caster, target);
    stage.until(900, function () { return stage.hadMobEffect(target, "world_combat:status/attract"); }, function () {
        stage.expect(stage.casts("attract", caster) > 0, "attract was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/attract"), "target became infatuated");
        stage.note("attract landed by the opposite-gender rule and applied world_combat:status/attract; the charmed foe is never displaced",
            { casts: stage.casts("attract", caster), targetHealth: target.health(), targetTravelled: stage.travelled(target) });
        stage.setPp(caster, "attract", 0); stage.noai(caster, target);
        const strong = stage.pokemon({ species: "mewtwo", level: 100, moves: ["attract"], at: [7, 0, 0], properties: "nature=modest" });
        const mob = stage.mob({ type: "minecraft:iron_golem", at: [10, 0, 0] });
        stage.noai(mob); stage.provoke(strong, mob);
        stage.until(400, () => stage.hasMobEffect(mob, "world_combat:attract_infatuation"), function () {
            stage.expect(stage.casts("attract", strong) > 0, "high Special Attack can charm an ordinary mob without invalid chance");
            stage.after(5, () => stage.done());
        }, "high-stat infatuation");
    }, "infatuation applied");
});

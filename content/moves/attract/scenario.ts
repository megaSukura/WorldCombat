// 迷人：近距一次飞吻软控。飞吻会缓慢追踪，开阔平地上几乎必中；命中时距离在羁绊范围内、视线畅通才着迷，
// 着迷只让目标心软、不拖拽，所以断言「放出来了」「目标着了迷」两件必然事实，随机的心软次数与目标有没有被拽动
// 都留给轨迹读取。宝可梦、普通生物走同一条判定，不再按性别硬拦。
Smoke.scenario("attract", function (stage) {
    const caster = stage.pokemon({ species: "pikachu", level: 41, moves: ["attract"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "raichu", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () { return stage.hadMobEffect(target, "world_combat:status/attract"); }, function () {
        stage.expect(stage.casts("attract", caster) > 0, "attract was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/attract"), "target became infatuated");
        stage.note("attract held at close range and applied world_combat:status/attract; the charmed foe is never displaced",
            { casts: stage.casts("attract", caster), targetHealth: target.health(), targetTravelled: stage.travelled(target) });
        stage.setPp(caster, "attract", 0); stage.noai(caster, target);
        const strong = stage.pokemon({ species: "mewtwo", level: 100, moves: ["attract"], at: [7, 0, 0], properties: "nature=modest" });
        // 高特攻个体的羁绊范围更小（约 3 格），贴在它够得到的距离内才能构成稳定着迷。
        const mob = stage.mob({ type: "minecraft:iron_golem", at: [9, 0, 0] });
        stage.noai(mob); stage.provoke(strong, mob);
        stage.until(400, () => stage.hasMobEffect(mob, "world_combat:attract_infatuation"), function () {
            stage.expect(stage.casts("attract", strong) > 0, "high Special Attack can charm an ordinary mob without invalid chance");
            stage.after(5, () => stage.done());
        }, "high-stat infatuation");
    }, "infatuation applied");
});

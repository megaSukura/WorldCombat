// 水流环的可执行设计说明：先让施术者掉血，AI 才会把水幕铺上；水幕挂上后每 interval 刻回一口。
// 必然事实：施术者提交过水流环；身上出现过共享身份 world_combat:status/aquaring。
// 回血量、回血节奏、雨中的加成与涌泉／细流的差别都是数值项，写进 note 供读轨迹判断（smoke 没有回血总量读数）。
// 说明：私有装配只注册本单元的动作，对手的「撞击」不在其中，所以对手不会真的反击；这里用服务端 /damage 分小步压血。
Smoke.scenario("aquaring", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "corsola", level: 40, moves: ["aquaring"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [9, 0, 0] });

    // 分小步压到自身最大生命约 65%，稳稳跨过 AI 的铺环阈值；压到就停，避免把施术者打没。
    var maximum = 0, settled = false;
    function wound(): void {
        if (settled || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.65) { settled = true; return; }
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);
    stage.hostile(caster, foe);

    stage.until(800, function () {
        return stage.casts("aquaring", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/aquaring");
    }, function () {
        stage.expect(stage.casts("aquaring", caster) >= 1, "the wounded corsola committed aqua ring");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/aquaring"), "the shared aquaring identity landed on the caster");
        var before = caster.health();
        stage.after(220, function () {
            stage.note("水幕每隔 interval 刻回一口最大生命（不超上限）；本招不要求站定，可以边走边回。回量随特防增长、下雨更旺，涌泉／细流改变节奏与存续——这些都属数值项，读轨迹里的回血与位置变化判断。", {
                casterCasts: stage.casts("aquaring", caster),
                ringEver: stage.hadMobEffect(caster, "world_combat:status/aquaring"),
                healthBefore: Math.round(before * 10) / 10,
                healthAfter: Math.round(caster.health() * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "aqua ring is cast within 40 s");
});

/**
 * 扎根的可执行设计说明。
 *
 * 场面：一只只会扎根的走路草（Oddish，50 级）与一只僵尸（zombie）在一座四面围起的石室里开战；夜晚、天晴。
 *   围栏把施法者留在被记录过的石地上；用服务端 /damage 分小步把血线压到约 60%，跨过扎根阈值；
 *   守根距离放宽到 32，保证施法者逃到角落时仍把僵尸当威胁，从而稳定放出扎根。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/ingrain；根须不改动脚下任何方块（已取消地块替换）；
 *   当脚下被铺上危险方块（水）时，伙伴自己松开根基；共享身份随之消失，移动速度恢复，且在有界窗口内不再重新扎回去。
 * 每拍回了多少、移动速度被压到多少又恢复多少、松根时机，写进 note 供读轨迹判断。
 */
Smoke.scenario("ingrain", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.fill([-9, 0, -7], [9, 4, -7], "minecraft:stone");
    stage.fill([-9, 0, 7], [9, 4, 7], "minecraft:stone");
    stage.fill([-9, 0, -7], [-9, 4, 7], "minecraft:stone");
    stage.fill([9, 0, -7], [9, 4, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Oddish", level: 50, moves: ["ingrain"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    // 守根距离放宽到上限 24，保证施法者逃到角落时仍把僵尸当威胁；像其他场景一样，偏好改动放到场地就绪后再写。
    stage.after(5, function () { stage.prefer(caster, "ingrain", { ai: { maxChase: 24 } }); });
    // 用服务端 /damage 分小步压到约 60%，稳稳跨过扎根阈值；压到就停，避免把施法者打没。
    var maximum = 0, settled = false;
    function wound(): void {
        if (settled || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.6) { settled = true; return; }
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);
    stage.until(1200, function () {
        return stage.casts("ingrain", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/ingrain");
    }, function () {
        stage.expect(stage.casts("ingrain", caster) > 0, "ingrain was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ingrain"), "the caster carried the shared ingrain identity");
        stage.expect(!stage.changedBlocks().some(function (b) { return b.after === "minecraft:rooted_dirt"; }),
            "roots grip the ground without replacing any block");
        stage.note("ingrain engaged", {
            casts: stage.casts("ingrain", caster),
            baseSpeed: Math.round(baseSpeed * 1000) / 1000,
            rootedSpeed: Math.round(stage.attribute(caster, "minecraft:generic.movement_speed") * 1000) / 1000,
            health: Math.round(caster.health() * 10) / 10,
            hurt: Math.round(stage.damageTo(caster) * 10) / 10,
            changed: stage.changedBlocks().length
        });
        // 制造「脚下危险」：在施法者脚下铺一片水。AI 应识别到不再适合扎根，自己主动松根。
        var p = caster.position(), fx = Math.floor(p[0]), fy = Math.floor(p[1]), fz = Math.floor(p[2]);
        stage.command("fill " + (fx - 1) + " " + fy + " " + (fz - 1) + " " + (fx + 1) + " " + fy + " " + (fz + 1) + " minecraft:water");
        stage.until(200, function () {
            return !stage.hasMobEffect(caster, "world_combat:status/ingrain");
        }, function () {
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/ingrain"), "the caster self-released when the footing turned unsafe");
            var afterSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
            stage.expect(afterSpeed > 0.1, "movement was restored after the self-release");
            stage.note("ingrain self-released", {
                releasedSpeed: Math.round(afterSpeed * 1000) / 1000,
                health: Math.round(caster.health() * 10) / 10,
                travelled: Math.round(stage.travelled(caster) * 10) / 10
            });
            // 有界无根：水还在脚下，伙伴不应立刻又钉回去。
            stage.after(40, function () {
                stage.expect(!stage.hasMobEffect(caster, "world_combat:status/ingrain"), "stays unrooted while the footing stays unsafe");
                stage.note("ingrain stayed released", { alive: caster.alive(), health: Math.round(caster.health() * 10) / 10 });
                stage.done();
            });
        }, "self release on unsafe footing");
    }, "ingrain is cast");
});

/**
 * 挖洞 / Dig —— 可执行设计说明。
 *
 * 一句话：在天然土里钻出一条短通道，下潜、前移、在锁定落点破土，把真正被身体扫到的第一个敌人掀飞。
 *
 * 场面：整片天然厚土（y −5..−1 都是泥土，足够容纳一条地下通道）、晴天正午，30 级穿山鼠（会学挖洞）对
 *   16 级被定身的呆呆兽，相距 4 格。AI 一见到目标就会下铲，预检也能在厚土里选出一条通道。
 *
 * 断言只取必然事实：被放出过、身体真的沉到地表以下、地下真的开出了通道（那一格变空气）、破土打到了目标、
 *   通道之后恢复成泥土（不留长期坑洞）。命中/暴击/伤害量、出土掀飞的高度与通道具体走向都随走位与掷骰变化，
 *   写进 note。
 */
Smoke.scenario("dig", function (stage) {
    // A thick natural soil layer so the passage (below the surface) is genuinely diggable.
    stage.fill([-8, -5, -8], [8, -1, 8], "minecraft:dirt");
    stage.weather("clear");
    stage.time("noon");
    var digger = stage.pokemon({ species: "sandshrew", level: 30, moves: ["dig"], at: [-2, 0, 0] });
    // A rooted target stays on the locked point while the user burrows; a fast one can walk the point out from under it.
    var prey = stage.pokemon({ species: "slowpoke", level: 16, moves: ["tackle"], at: [2, 0, 0] });
    stage.noai(prey);
    stage.hostile(digger, prey);
    var minY = digger.position()[1], openedAir = false, wasOpen = false, restored = false;
    stage.until(1400, function () {
        var y = digger.position()[1];
        if (y < minY) minY = y;
        var cell = stage.blockAt([0, -2, 0]);
        if (cell === "minecraft:air") { openedAir = true; wasOpen = true; }
        if (wasOpen && cell === "minecraft:dirt") restored = true;
        return stage.casts("dig", digger) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(20, function () {
            if (stage.blockAt([0, -2, 0]) === "minecraft:dirt") restored = true;
            stage.expect(stage.casts("dig", digger) >= 1, "sandshrew committed dig");
            stage.expect(minY < -1, "the body actually descended below the surface");
            stage.expect(openedAir, "a real soil passage was opened under the surface");
            stage.expect(stage.damageTo(prey) > 0, "the emergence struck the target");
            stage.expect(restored, "the temporary passage restored to soil");
            stage.note("dig really burrows under the surface and erupts on the target, then the lease restores the soil; variable: crit, damage roll, launch height, the exact passage path, and whether the prey survives.", {
                casts: stage.casts("dig", digger),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                diggerMinY: Math.round(minY * 10) / 10,
                diggerTravelled: Math.round(stage.travelled(digger) * 10) / 10,
                passageOpened: openedAir,
                passageRestored: restored,
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10
            });
            stage.done();
        });
    }, "dig opens a soil passage, descends, erupts and restores within 70 s");
});

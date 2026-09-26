/**
 * 仿效的可执行设计说明。
 *
 * 场面：一只只会仿效的小火龙对 6 格外、只会无理取闹的勾魂眼开战；勾魂眼会先出手，于是附近很快出现一条
 *   可借的短期回声（无理取闹）。这验证了本招新的“附近最新一条记录”来源：借招不再依赖全场最后一声，
 *   而是在回荡距离内挑最新的一条。
 * 必然事实：来源先提交过一手；仿效随后借用同一笔提交把它使出（casts("copycat") 增长即证明借来的那一手
 *   真的被提交，因为仿效若拿不到合法输入或借招被拒，整个动作会被退回、不落 committed）。
 * 随机结果：实际借到哪一手、来源是否也被无理取闹命中写进 note 供读轨迹判断。
 */
Smoke.scenario("copycat", function (stage) {
    var caster = stage.pokemon({ species: "Charmander", level: 36, moves: ["copycat"], at: [-3, 0, 0] });
    var source = stage.pokemon({ species: "Sableye", level: 38, moves: ["torment"], at: [3, 0, 0] });
    stage.hostile(caster, source);
    stage.note("staged: charmander(36) copycat vs sableye(38) torment at 6 blocks; sableye acts first so the nearby echo is torment");
    stage.until(1600, function () { return stage.casts("copycat", caster) >= 1; }, function () {
        stage.expect(stage.casts("torment", source) >= 1, "the nearby source committed a move to borrow");
        stage.expect(stage.casts("copycat", caster) >= 1, "copycat committed the borrowed move");
        stage.note("copycat echoed the nearby source; read the cast line to see it was torment", {
            sourceCasts: stage.casts("torment", source), casterCasts: stage.casts("copycat", caster),
            sourceTormented: stage.hadMobEffect(source, "world_combat:torment_itch")
        });
        stage.done();
    }, "copycat cast");
});

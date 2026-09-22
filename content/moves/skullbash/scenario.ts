/**
 * 火箭头锤 / Skull Bash —— 可执行设计说明。
 *
 * 一句话：缩头蹲桩（自身 rooted、加护甲、提升原生防御，并用共用 GuardEffects 架住伤害），蓄满后沿
 *   锁定方向做直线重撞；命中第一个敌人时读它背后——背后是墙/方块就把它钉在墙上，威力 ×slamBonus、
 *   rooted slamStun 刻撞乱节奏，并把背后那几格墙凿成一个临时缺口（world.terrain 的 linger 租约，
 *   换成空气、breachTicks 后原地形自己放回）。
 *
 * 场面：石面平地、晴空正午。一只只会火箭头锤的 squirtle（技能表只给这一招，私有冒烟装配里别的动作
 *   都不在，AI 就只会用它）在目标正后方立一面石墙（offset x=4），目标 slowpoke（迟钝、技能表带撞击）
 *   背对墙站在 x=3，施术者从 x=-3 起手。两者敌对后 AI 自己走位、缩头、沿直线冲撞。目标睡眠开场，
 *   正对上这招「惩罚站桩目标」的用途：它能在整段蓄力与冲撞里停在原地，让「背墙被钉」这件事可复现。
 *
 * 断言只取必然事实（在「这招正常工作」的前提下）：施术者提交过火箭头锤；冲撞对目标造成了伤害；
 *   目标背后的石墙被凿成了临时缺口（changedBlocks 读到 minecraft:air）；这一撞把施术者沿直线推出去。
 *
 * 随机量写进 note：单次伤害与暴击、目标撑不撑得住、要几次冲撞才把它顶到墙上、缺口实际凿了几格、
 *   缺口几刻后合拢。蓄力的 rooted 与 GuardEffects 是共享脚本效果而不是 MobEffect，舞台的
 *   hadMobEffect 读不到，所以站桩只从时序与表现间接说明，不做断言。
 */
Smoke.scenario("skullbash", function (stage) {
    // A stone wall right behind the target's back: this is the move's extra material (slam bonus + temporary breach).
    stage.fill([4, -1, -4], [4, 2, 4], "minecraft:stone");
    stage.weather("clear");
    stage.time("noon");
    // A common Skull Bash learner that only knows this move, so the AI has nothing else to choose.
    var caster = stage.pokemon({ species: "squirtle", level: 30, moves: ["skullbash"], at: [-3, 0, 0] });
    // A stationary punching bag: sleeping so it stays backed against the wall through the tuck and charge.
    var target = stage.pokemon({ species: "slowpoke", level: 25, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, target);
    // Wait for a charge that actually pins the foe and carves the wall, not just any hit.
    stage.until(1200, function () {
        return stage.casts("skullbash", caster) >= 1 && stage.damageTo(target) > 0
            && stage.changedBlocks().filter(function (cell) { return cell.at[0] === 4 && cell.after === "minecraft:air"; }).length > 0;
    }, function () {
        // Terrain leases land through the world a few ticks after the impact; read the gap while it lives.
        stage.after(6, function () {
            var gap = stage.changedBlocks().filter(function (cell) { return cell.at[0] === 4 && cell.after === "minecraft:air"; });
            stage.expect(stage.casts("skullbash", caster) >= 1, "squirtle committed skull bash");
            stage.expect(stage.damageTo(target) > 0, "the charge damaged the target");
            stage.expect(gap.length > 0, "the pinned foe's back wall was carved into a temporary gap");
            stage.expect(stage.travelled(caster) > 1, "the charge carried the caster down the line");
            stage.note("a charge hit a foe whose back was against the recorded wall: it took the slam multiplier and the wall was leased to air as a gap that closes again. Random here: damage roll and crit, whether the slowpoke survives, how many charges it took to pin it, how many wall cells the breach actually carved, and how long the gap stayed open. rooted/GuardEffects during the tuck are shared script effects, not MobEffects, so the stage cannot see them.", {
                casts: stage.casts("skullbash", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                gapCells: gap.length,
                targetHealth: Math.round(target.health() * 10) / 10,
                targetAlive: target.alive(),
                targetTackles: stage.casts("tackle", target)
            });
        });
        // The breach lease is breachTicks (120 t) long; look once more after it should have closed.
        stage.after(160, function () {
            var stillOpen = stage.changedBlocks().filter(function (cell) { return cell.at[0] === 4 && cell.after === "minecraft:air"; }).length;
            stage.note("after the first gap's 120-tick lease, the wall should have returned to stone unless a later charge carved it again", {
                gapCellsNow: stillOpen,
                casts: stage.casts("skullbash", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                targetAlive: target.alive()
            });
            stage.done();
        });
    }, "skull bash pins a foe to a wall and breaches it within 60 s");
});

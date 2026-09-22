/**
 * 炸蛋 / eggbomb —— 参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 100／命中 75／PP 10／优先度 0／非接触（Cobblemon 1.8 / Showdown）。
 *   描述「向对手用力投掷大大的蛋进行攻击。」6 位学习者。
 *
 * 翻译：把「用最大力气抡出一枚大蛋」落成一次**沉稳、笨重的单发抛掷**——它重、它不好瞄（原生 75 翻成
 *   较大的「散布」，等级越高越能压住），砸中就是本族最重的单体一记；抡偏了蛋就在落点摔碎，摊开一小片
 *   滑蛋液，之后走到那里的人都会打滑。所以躲开也有代价——这是它和种子炸弹（可控的头顶种雨、覆盖一圈）
 *   分开的地方：炸蛋是一枚巨大的、抡过头的蛋，命中很重、失手的落点也会留一地滑。
 *
 * 技术：滑蛋液是 `world_combat:status/slick` 共享身份，由本单元在 `startup.ts` 声明的 MobEffect
 *   （`world_combat:eggbomb_slick`，自带移动速度修饰）承载；落点那圈由 `WorldEffects.field` 的
 *   字段规则 `world_combat:eggbomb_slick` 维持，踩进来的非友方被刷新这段状态。
 *
 * 配置 `heavy`（重蛋式）双向取舍：开＝威力 ×1.2、覆盖更广、滑得更久，代价是散布 ×1.35、石速 ×0.85、
 *   起手 +4 刻、冷却 +8 刻；关（直投式）＝散布 ×0.8、抛得更快、起手更短，代价是威力 ×0.85、覆盖更小。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   egg     蛋威力 ← 物攻＋等级，heavy ×1.2 / 直投 ×0.85。
 *   heave   抛掷速度 ← 物攻，heavy ×0.85。
 *   scatter 散布 ← 等级（越高越稳），heavy ×1.35 / 直投 ×0.8。
 *   radius  蛋判定 ← 体型高度。
 *   reach   射程 ← 物攻＋等级，也是本招实际射程来源。
 *   splash  滑蛋液半径 ← 体型高度，heavy ×1.15。
 *   shards  碎壳量 ← 物攻。
 *   slickTicks 滑蛋液存续 ← 等级，heavy ×1.2。
 *   arc     弧坠 ← 体重，heavy ×1.2。
 *   tempo／aftercast／recharge ← 速度，heavy 更慢更长。
 *
 * 伤害段 `egg` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("eggbomb", {
        /** 蛋威力：70 + 物攻偏移[−14,34] + 等级(≥25)偏移[0,12]；heavy ×1.2 / 直投 ×0.85；夹 48..130。 */
        egg: formula(
            F.base(70)
                .plus(F.stat("attack").minus(50).times(0.18).clamp(-14, 34))
                .plus(F.level().minus(25).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(1.2), F.const(0.85)))
                .clamp(48, 130).round(1),
            "蛋威力", {
                unit: "威力",
                description: "这枚大蛋砸实那一下的威力；物攻越高抡得越重，等级越高蛋也越沉。重蛋式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抛掷速度：1.0 + 物攻偏移[−0.1,0.45]；heavy ×0.85；夹 0.8..1.6。 */
        heave: formula(
            F.base(1.0).plus(F.stat("attack").minus(50).times(0.006).clamp(-0.1, 0.45))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(0.85), F.const(1.0)))
                .clamp(0.8, 1.6).round(2),
            "抛掷速度", {
                unit: "格/刻",
                description: "大蛋抡出手后的飞行速度；物攻越高抡得越急。重蛋式更沉、抛得慢一些，对手更容易看清弧线。"
            }),
        /** 散布：9° − 等级(≥20)偏移[0,3.5]；heavy ×1.35 / 直投 ×0.8；夹 3.5..12。 */
        scatter: formula(
            F.base(9).minus(F.level().minus(20).times(0.09).clamp(0, 3.5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(1.35), F.const(0.8)))
                .clamp(3.5, 12).round(2),
            "散布", {
                unit: "°",
                description: "大蛋离手时的随机偏角；等级越高越能压住「用力过猛」的手。这就是原生 75 命中的翻译：抡偏了蛋就在落点摔碎。重蛋式散得更开。"
            }),
        /** 蛋判定：0.4 + 体型高度偏移[−0.08,0.35]；夹 0.32..0.75。 */
        radius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.35)).clamp(0.32, 0.75).round(2),
            "蛋判定", {
                unit: "格",
                description: "飞行中的大蛋能砸到多大一圈；大个子抡的蛋更大。画出的蛋大小与它一致。"
            }),
        /** 射程：9 + 物攻偏移[−1,2] + 等级(≥25)偏移[0,2]；夹 7..12。 */
        reach: formula(
            F.base(9)
                .plus(F.stat("attack").minus(50).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2))
                .clamp(7, 12).round(1),
            "射程", {
                unit: "格",
                description: "大蛋能抡到多远的目标；物攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 滑蛋液半径：1.6 + 体型高度偏移[−0.4,1.2]；heavy ×1.15；夹 1.2..3.0。 */
        splash: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.4, 1.2))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(1.15), F.const(1.0)))
                .clamp(1.2, 3.0).round(2),
            "滑蛋液半径", {
                unit: "格",
                description: "蛋摔碎后摊开多大一圈滑蛋液；大个子的蛋摊得更宽。它也是指示圈与滑区判定的半径。"
            }),
        /** 碎壳量：12 + 物攻偏移[−3,12]；夹 9..26。 */
        shards: formula(
            F.base(12).plus(F.stat("attack").minus(50).times(0.12).clamp(-3, 12)).clamp(9, 26).round(0),
            "碎壳量", {
                unit: "片",
                description: "蛋壳摔碎时弹出的碎片数量，由物攻换算；它驱动破碎与滑蛋液的表现密度，不是独立伤害。"
            }),
        /** 滑蛋液存续：50 刻 + 等级(≥25)偏移[0,40]；heavy ×1.2；夹 40..120。 */
        slickTicks: seconds(
            F.base(50).plus(F.level().minus(25).times(0.8).clamp(0, 40))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(1.2), F.const(1.0)))
                .clamp(40, 120).round(0),
            "滑蛋液存续", "落点那圈滑蛋液留多久；等级越高、重蛋式留得越久，这段时间里走进去的人都会打滑。"),
        /** 弧坠：0.03 + 体重偏移[−0.006,0.02]；heavy ×1.2；夹 0.02..0.06。 */
        arc: formula(
            F.base(0.03).plus(F.body("weight").minus(40).times(0.0001).clamp(-0.006, 0.02))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(1.2), F.const(1.0)))
                .clamp(0.02, 0.06).round(4),
            "弧坠", {
                unit: "格/刻²",
                description: "大蛋抛出后往下坠得多快；重精灵抡得平、轻精灵抡得吊。重蛋式落得更急。"
            }),
        /** 起手：7 刻 − 速度偏移[0,1.5]；heavy +4；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(4), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "把大蛋抡过头顶、蓄足力气的时间；速度越快越短，重蛋式要多蓄一下。"),
        /** 收招：7 刻 − 速度偏移[0,1]；夹 4..10。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.5, 1)).clamp(4, 10).round(0),
            "收招", "抡完大蛋后收手、缓过来的时间；快的个体更利落。"),
        /** 冷却：20 刻 − 速度偏移[0,2.5]；heavy +8；夹 14..34。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(50).times(0.035).clamp(-2, 2.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.eggbomb.preference.heavy")), F.const(8), F.const(0)))
                .clamp(14, 34).round(0),
            "冷却", "再抡一枚大蛋前的等待；它是一记沉重的抛掷，回得比小招慢，重蛋式更慢。")
    });

    defineDamage("eggbomb", "egg", {});

    stages("eggbomb", [
        { level: 30, values: { egg: 92 } },
        { level: 48, values: { egg: 108, reach: 11 } }
    ]);

    describe("eggbomb", [
        { key: "description.0", values: ["egg", "radius"] },
        { key: "description.1", values: ["heave", "reach", "scatter"] },
        { key: "description.2", values: ["arc", "splash", "shards", "slickTicks"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.egg"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.egg", "tier.1.reach"] }
    ]);
}

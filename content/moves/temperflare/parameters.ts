/**
 * 豁出去 / temperflare —— 参数、伤害段与「上一次出手落空」的记账。
 *
 * 原生事实：Fire／物理／威力 75／命中 100／PP 10／接触；
 *   「以自暴自弃的气势进行攻击。如果上一回合招式没有命中，威力就会翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗没有回合，本招把「上一回合招式没有命中」落成**一次真实的失手**——施法者上一次进攻
 *   出手没打出伤害时，身上留下「豁出去」的状态（共享身份 world_combat:status/temperflare）；带着这股
 *   自暴自弃的劲再冲，这一撞翻倍、火炸得更大、还会把撞到的人点着。任何命中都会把这股劲消掉。
 *   记账与跺脚同源（world_combat:committed 记出手，damage_applied 记有没有打中），是同一家族的两张脸：
 *   跺脚把悔恨跺进地里，豁出去把自己整个人烧着撞出去。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   flare     撞上威力：物攻定狠度、速度定冲势、等级补；带豁出去时 ×2。
 *   dash      冲锋距离：速度与等级；它也是实际射程来源。
 *   charge    每刻位移：速度。
 *   blast     爆开半径：身高与物攻。
 *   collisionRadius 判定半径：身高。
 *   push      撞退：物攻。
 *   scorch    崩开威力（对旁人的溅射）：物攻与等级。
 *   embers    火星数：物攻与等级，驱动表现。
 *   igniteTicks 带豁出去时把命中者点着多久：等级。
 *   scorchTicks／scorchCells 地面焦痕停留与块数：等级与物攻。
 *   tempo／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 reckless（豁出去）：冲得更远 ×1.15、更快 ×1.08、火炸得更大 ×1.2，但收招 +3、冷却 +8，
 *   且这一撞略散 ×0.95；关闭＝控制得当：短、干净、更集中。两向各有局面：追人 vs 精确点杀。
 */
namespace PokemonSkills {
    export const temperId = "temperflare";
    export const temperScene = "world_combat:move_temperflare";
    /** 共享身份：上一次出手落空后憋着的那股自暴自弃。 */
    export const temperStatus = "temperflare";
    export const temperEffect = "world_combat:temperflare_frustration";
    export const temperHitText = "world_combat.move.temperflare.text.hit";
    export const temperRageText = "world_combat.move.temperflare.text.rage";
    export const temperMissText = "world_combat.move.temperflare.text.miss";
    /** 豁出去持续：够下一次出手用掉。 */
    export const temperRageTicks = 110;
    var temperSwingWindow = { min: 6, max: 150 };
    var temperSwings: { [ref: string]: { attempt: number; land: number } } = Object.create(null);

    /** 施法者上一次出手是否打空（供 AI 与表现读同一份事实）。 */
    export function temperWhiffed(world: CombatWorld, actor: CombatActor): boolean {
        const swing = temperSwings[String(actor.ref())];
        if (swing === undefined) return false;
        const now = world.tick();
        return (swing.land || -1000) < swing.attempt
            && now - swing.attempt >= temperSwingWindow.min && now - swing.attempt <= temperSwingWindow.max;
    }

    actionParameters.define(temperId, {
        /** 撞上威力：基础 75，物攻每比 60 多 1 加 0.3（夹 −14..32），速度每比 60 快 1 加 0.12（夹 −6..18），等级每比 30 高 1 加 0.4（夹 −4..10）；带豁出去 ×2、豁出去式 ×0.95；夹 38..190。 */
        flare: formula(
            F.base(75)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-14, 32))
                .plus(F.stat("speed").minus(60).times(0.12).clamp(-6, 18))
                .plus(F.level().minus(30).times(0.4).clamp(-4, 10))
                .times(F.when(F.status(temperStatus).gt(0), F.const(2), F.const(1)).as(text("worldcombat.skill.temperflare.value.rage")))
                .times(F.when(F.pref("reckless"), F.const(0.95), F.const(1)))
                .clamp(38, 190).round(1),
            "撞上威力", {
                unit: "威力",
                description: "裹着火撞上目标那一下的基础威力；物攻给狠度、速度给冲势。上一次出手落空、还憋着那股自暴自弃时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 崩开威力：基础 38，物攻每比 60 多 1 加 0.18（夹 −8..22），等级每比 30 高 1 加 0.25（夹 −3..8）；夹 22..96。 */
        scorch: formula(
            F.base(38).plus(F.stat("attack").minus(60).times(0.18).clamp(-8, 22))
                .plus(F.level().minus(30).times(0.25).clamp(-3, 8)).clamp(22, 96).round(1),
            "崩开威力", {
                unit: "威力",
                description: "撞上后火团炸开，对身边其他敌人的溅射威力；物攻越高、等级越高炸得越狠。"
            }),
        /** 冲锋距离：基础 3.2 格，速度每比 60 快 1 加 0.02（夹 −0.5..1.4），等级每比 30 高 1 加 0.02（夹 −0.2..0.6）；豁出去式 ×1.15；夹 2.4..5.2。 */
        dash: formula(
            F.base(3.2).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.5, 1.4))
                .plus(F.level().minus(30).times(0.02).clamp(-0.2, 0.6))
                .times(F.when(F.pref("reckless"), F.const(1.15), F.const(1)))
                .clamp(2.4, 5.2).round(2),
            "冲锋距离", {
                unit: "格",
                description: "朝目标撞出去的最大距离；腿快的个体冲得更远。它也是本招的实际射程来源。"
            }),
        /** 每刻位移：基础 0.72 格/刻，速度每比 60 快 1 加 0.004（夹 −0.12..0.34）；豁出去式 ×1.08；夹 0.5..1.2。 */
        charge: formula(
            F.base(0.72).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34))
                .times(F.when(F.pref("reckless"), F.const(1.08), F.const(1))).clamp(0.5, 1.2).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "撞上去每刻移动的距离；越快越难在半路被躲开。"
            }),
        /** 爆开半径：基础 1.5 格，碰撞箱每比 1.4 高 1 格加 0.4（夹 −0.1..0.9），物攻每比 60 多 1 加 0.006（夹 −0.2..0.5）；豁出去式 ×1.2；夹 1.0..3.4。 */
        blast: formula(
            F.base(1.5).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.1, 0.9))
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.2, 0.5))
                .times(F.when(F.pref("reckless"), F.const(1.2), F.const(1)))
                .clamp(1.0, 3.4).round(2),
            "爆开半径", {
                unit: "格",
                description: "撞上那一下火团铺开的判定半径；大个子、物攻高的个体炸得更开。"
            }),
        /** 判定半径：基础 0.45 格，碰撞箱每比 1.4 高 1 格加 0.12（夹 −0.08..0.3）；夹 0.34..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.3)).clamp(0.34, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "冲锋途中能撞到多大一圈；身板大的个体撞得更宽。"
            }),
        /** 撞退：基础 0.35 格，物攻每比 60 多 1 加 0.004（夹 −0.1..0.45）；夹 0.15..0.85。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.45)).clamp(0.15, 0.85).round(2),
            "撞退", {
                unit: "格",
                description: "被撞中的人沿冲锋方向被顶开的距离；力量越大顶得越远。"
            }),
        /** 火星数：基础 18，物攻每比 60 多 1 加 0.2（夹 −4..26），等级每比 30 高 1 加 0.3（夹 −3..9）；夹 12..56。 */
        embers: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.2).clamp(-4, 26))
                .plus(F.level().minus(30).times(0.3).clamp(-3, 9)).clamp(12, 56).round(0),
            "火星数", {
                unit: "个",
                description: "这一撞炸出的火星数量；物攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 引燃时长：基础 40 刻，等级每比 30 高 1 加 0.3 刻（夹 −6..18）；夹 30..80。 */
        igniteTicks: seconds(
            F.base(40).plus(F.level().minus(30).times(0.3).clamp(-6, 18)).clamp(30, 80).round(0),
            "引燃时长", "带豁出去时，被撞中的人会被点着多久；等级越高烧得越久。"),
        /** 焦痕停留：基础 70 刻 + 等级 ×0.8；夹 50..150。 */
        scorchTicks: seconds(
            F.base(70).plus(F.level().times(0.8)).clamp(50, 150).round(0),
            "焦痕停留", "撞炸的落点在地面留下的焦痕停留多久；到期原方块回来。"),
        /** 焦痕块数：基础 12 + 物攻 ×0.15；夹 8..32。同时驱动表现密度。 */
        scorchCells: formula(
            F.base(12).plus(F.stat("attack").times(0.15)).clamp(8, 32).round(0),
            "焦痕块数", {
                unit: "块",
                description: "地面被烧焦的块数；随物攻增长，也决定画面的密度。"
            }),
        /** 起手：基础 5 刻，速度每比 60 快 1 减 0.02 刻（夹 −1..2）；夹 3..9。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(3, 9).round(0),
            "起手", "点着火、蹬地到撞出去之间的时间；速度快的个体起得更快。"),
        /** 收招：基础 8 刻，豁出去式 +3；夹 5..14。 */
        settle: seconds(
            F.base(8).plus(F.when(F.pref("reckless"), F.const(3), F.const(0))).clamp(5, 14).round(0),
            "收招", "撞完收住的时间；豁出去式冲得更远、也要收更久。"),
        /** 冷却：基础 30 刻，速度每比 60 快 1 减 0.12 刻（夹 −4..6），豁出去式 +8；夹 18..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("reckless"), F.const(8), F.const(0))).clamp(18, 46).round(0),
            "冷却", "这一撞之后多久能再豁出去一次；速度快的个体回得更快，豁出去式更费。")
    });

    defineDamage(temperId, "flare", {}, { contact: true });
    defineDamage(temperId, "scorch", {});

    stages(temperId, [
        { level: 34, values: { flare: 92 } },
        { level: 52, values: { flare: 112, blast: 1.9 } }
    ]);

    describe(temperId, [
        { key: "description.0", values: ["flare"] },
        { key: "description.1", values: ["scorch", "blast", "push"] },
        { key: "description.2", values: ["dash", "charge", "igniteTicks", "scorchTicks", "scorchCells"] },
        { key: "reckless.on", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) === true; } },
        { key: "reckless.off", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flare"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.flare", "tier.1.blast"] }
    ]);

    // ---- 记账：与跺脚同源，独立身份，两个单元互不干扰 ----
    WorldCombat.on("world_combat:temperflare/swing", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || action.targetKind() !== "enemy") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.observe(actor) === null) return;
        const ref = String(actor.ref()), now = world.tick(), previous = temperSwings[ref];
        const spent = previous !== undefined && (previous.land || -1000) < previous.attempt
            && now - previous.attempt >= temperSwingWindow.min && now - previous.attempt <= temperSwingWindow.max;
        if (spent) CombatStatus.apply(world, actor, temperStatus, temperEffect, temperRageTicks, 0, { unique: true });
        temperSwings[ref] = { attempt: now, land: previous === undefined ? -1000 : previous.land };
    });
    WorldCombat.on("world_combat:temperflare/land", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (data.kind !== "move" || !(data.actual > 0)) return;
        const world = event.world(), actor = event.actor(), swing = temperSwings[String(actor.ref())];
        if (swing !== undefined) swing.land = world.tick();
        CombatStatus.cure(world, actor, temperStatus);
    });
}

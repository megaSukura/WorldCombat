/**
 * 豁出去 / temperflare —— 参数、伤害段与「上一次出手落空」的记账。
 *
 * 原生事实：Fire／物理／威力 75／命中 100／PP 10／接触；
 *   「以自暴自弃的气势进行攻击。如果上一回合招式没有命中，威力就会翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗没有回合，本招把「上一回合招式没有命中」落成**一次真实的失手**——施法者上一次进攻
 *   真正判空后，身上留下「豁出去」的状态（共享身份 world_combat:status/temperflare）；带着这股
 *   自暴自弃的劲再冲，这一撞翻倍、火炸得更大、还会把撞到的人点着。任何命中都会把这股劲消掉。
 *   判定与跺脚同源共享的 ExecutionOutcomes 账本（previous/latest），不自己猜时间戳：长弹在飞时是 pending
 *   而非落空，旧招的迟到伤也不会重写当前这次冲锋；提示 identity 由世界贡献转成可见状态。
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
 *   igniteTicks 带豁出去时把命中者点着多久：等级；免疫火的生物不会被点着。
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

    /**
     * 施法者上一次出手是否真的打空：读共享 ExecutionOutcomes 账本。
     * 提交时用 `previous(action)` 的冻结快照（当前冲锋不会被旧弹体迟到伤或别的间接伤重写）；
     * 预览与 AI 用 `latest`。只有真正已判定的 miss 才算，长弹仍在飞时是 pending，不算落空。
     */
    export function temperWhiffed(world: CombatWorld, actor: CombatActor, action?: CombatAction | null): boolean {
        const sameActor = !!action && String(action.actor().ref()) === String(actor.ref());
        const result = sameActor ? ExecutionOutcomes.previous(action!, temperRageTicks)
            : ExecutionOutcomes.latest(world, actor, temperRageTicks);
        return result !== null && result.status === "miss";
    }
    defineFacts(temperId, context => ({ read: id => {
        if (id !== "temperflare.previousMiss") return undefined;
        return !!context.world && !!context.actor && temperWhiffed(context.world, context.actor, context.action);
    } }));

    actionParameters.define(temperId, {
        /** 撞上威力：基础 75，物攻每比 60 多 1 加 0.3（夹 −14..32），速度每比 60 快 1 加 0.12（夹 −6..18），等级每比 30 高 1 加 0.4（夹 −4..10）；带豁出去 ×2、豁出去式 ×0.95；夹 38..190。 */
        flare: formula(
            F.base(75)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-14, 32))
                .plus(F.stat("speed").minus(60).times(0.12).clamp(-6, 18))
                .plus(F.level().minus(30).times(0.4).clamp(-4, 10))
                .times(F.when(F.var("temperflare.previousMiss", text("worldcombat.skill.temperflare.value.rage")), F.const(2), F.const(1)).as(text("worldcombat.skill.temperflare.value.rage")))
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
            "引燃时长", "带豁出去时，被撞中的敌人会被点着多久；等级越高烧得越久，免疫火的生物不会被点着。"),
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
        { key: "description.1", values: ["scorch","blast","push"] },
        { key: "description.2", values: ["dash","charge","igniteTicks"] },
        { key: "description.additional", values: [] },
        { key: "reckless.on", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) === true; } },
        { key: "reckless.off", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flare"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.flare","tier.1.blast"] }
    ]);

    // 可见提示随共享账本走：latest 结算为真正的 miss 时挂上「豁出去」凭据，任何后续命中或超时都收掉。
    // 提示 identity 由 startup.ts 的 world_combat:temperflare_frustration 提供；公式与 AI 读同一份 temperWhiffed。
    ExecutionOutcomes.views.define({ id: "world_combat:temperflare/cue", apply: view => {
        const world = view.world, actor = view.actor;
        if (!NativeLoadout.hasEquipped(world, actor, temperId)) return;
        const result = ExecutionOutcomes.latest(world, actor, temperRageTicks);
        const cue = MobEffects.read(world, actor, temperEffect);
        if (result && result.status === "miss" && result.ended !== null) {
            const remaining = Math.max(1, temperRageTicks - (world.tick() - result.ended));
            if (!cue) MobEffects.apply(world, actor, temperEffect, remaining, 0);
        } else if (cue) MobEffects.consume(world, actor, temperEffect);
    } });
}

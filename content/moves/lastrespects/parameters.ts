/**
 * 扫墓 / lastrespects —— 参数、伤害段与倒下伙伴的记录。
 *
 * 原生事实：Ghost／物理／基础威力 50／命中 100／PP 10／无接触，威力 = 50 + 50 × 我方已倒下数
 *   （`side.totalFainted`）（Cobblemon 1.8，2 位学习者）。
 *
 * 翻译：即时战斗里没有「队伍里倒了几只」，本实现把它翻成**本场累计的倒下伙伴**——同一阵营（同队伍或同主人）
 *   的战斗者倒下的位置与身份被记下，之后施法者每放一次扫墓，就有一位伙伴的悔恨从地里升起、汇进这一击：
 *   **倒下的伙伴越多，随行的鬼影越多、这一扫越重**。它和愤怒之拳分开：愤怒之拳记的是**自己挨了几下**、
 *   打出一串拳；扫墓记的是**伙伴倒了几位**、是一记替他们送行的重扫。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   fallen     倒下伙伴数：本场累计的、与施法者同阵营的倒下记录——本招的核心机制值。
 *   mourn      扫墓威力：基础 48 + 倒下伙伴 ×50（封顶 +250）+ 物攻偏移 + 等级偏移；随行 ×0.85 / 送行 ×1.1；夹 46..320。
 *   ghosts     随行鬼影：基础 2 + 倒下伙伴 ×3；夹 2..20；决定起手与行进里升起几道鬼影。
 *   reach      送葬距离：基础 3.4 格 + 速度偏移 + 等级偏移 + 倒下伙伴偏移；夹 3..6.5；也是实际射程来源。
 *   speed      行进速度：基础 0.7 格/刻 + 速度偏移；夹 0.5..1.3。
 *   width      扫过宽度：基础 0.5 格 + 体型宽度偏移 + 倒下伙伴偏移；随行 ×1.5；夹 0.4..1.3。
 *   push       顶开距离：基础 0.35 格 + 物攻偏移 + 倒下伙伴偏移；夹 0.2..0.9。
 *   tempo／settle／recharge：速度定节奏，倒下伙伴越多起手越沉、冷却越久。
 *
 * 配置 `trail`（随行）双向取舍：开启＝鬼影沿路随行，这一扫变成沿线走廊、打到路上所有人（每人 ×0.85）、
 *   扫过更宽；关闭（送行）＝鬼影聚到一点，只打一个目标、单发 ×1.1、顶得更开。沿路清 vs 单点重，各有局面。
 *
 * 伤害段 `mourn` 与参数同名：这一扫随精灵数据变化的那部分；对手防御、相性与暴击在命中时统一结算。
 * 属性与分类沿用原生 Ghost／物理，无接触标记。
 */
namespace PokemonSkills {
    export const lastrespectsId = "lastrespects";
    export const lastrespectsScene = "world_combat:move_lastrespects";
    export const lastrespectsStrikeText = "world_combat.move.lastrespects.text.strike";
    export const lastrespectsMarchText = "world_combat.move.lastrespects.text.march";
    export const lastrespectsMissText = "world_combat.move.lastrespects.text.miss";
    /** 倒下记录的保留上限与记忆窗口；同一阵营的记录按时间从新到旧累计。 */
    export const lastrespectsLimit = 32;
    export const lastrespectsMemory = 12000;

    interface LastRespectsFallen { tick: number; team: string; owner: string; species: string; }
    var lastrespectsFallen: LastRespectsFallen[] = [];
    // 致命一击结算时目标可能已不再 valid，所以阵营身份在 still-alive 的 incoming 事件里先记下。
    var lastrespectsIdentity: { [ref: string]: { team: string; owner: string; species: string } } = Object.create(null);

    function lastrespectsTeam(world: CombatWorld, actor: CombatActor): string {
        const entity = world.nativeEntity(actor);
        if (entity === null || typeof entity.getTeam !== "function") return "";
        const team = entity.getTeam();
        return team === null || team === undefined ? "" : String(team.getName());
    }

    function lastrespectsOwner(actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon") return "";
        try { return String(CobblemonCombat.pokemon(actor).owner()); } catch (error) { return ""; }
    }

    function lastrespectsSpecies(actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon") return "";
        try { return String(CobblemonCombat.pokemon(actor).species()); } catch (error) { return ""; }
    }

    /** 本场累计的、与施法者同阵营（同队伍或同主人）的倒下伙伴数；没有阵营身份的战斗者不计。 */
    export function lastrespectsCount(world: CombatWorld, actor: CombatActor): number {
        const team = lastrespectsTeam(world, actor), owner = lastrespectsOwner(actor);
        if (team === "" && owner === "") return 0;
        const now = world.tick();
        let count = 0;
        for (let index = 0; index < lastrespectsFallen.length; index++) {
            const entry = lastrespectsFallen[index];
            if (now - entry.tick > lastrespectsMemory) continue;
            if ((team !== "" && entry.team === team) || (owner !== "" && entry.owner === owner)) count++;
        }
        return count;
    }

    function lastrespectsRecord(tick: number, identity: { team: string; owner: string; species: string }): void {
        if (identity.team === "" && identity.owner === "") return;
        lastrespectsFallen.push({ tick: tick, team: identity.team, owner: identity.owner, species: identity.species });
        if (lastrespectsFallen.length > lastrespectsLimit) lastrespectsFallen.shift();
    }

    defineFacts(lastrespectsId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            if (id === "lastrespects.fallen") return lastrespectsCount(context.world, context.actor);
            return undefined;
        } };
    });

    // 倒下记录：任何战斗者被打死（after ≤ 0）时记下阵营与身份，供同阵营的施法者送行。
    WorldCombat.on("world_combat:move_lastrespects/incoming", "world_combat:damage_incoming", "", function (event) {
        const victim = event.target();
        if (victim === null) return;
        const world = event.world();
        if (!world.valid(victim)) return;
        const ref = String(victim.ref());
        lastrespectsIdentity[ref] = { team: lastrespectsTeam(world, victim), owner: lastrespectsOwner(victim), species: lastrespectsSpecies(victim) };
        if (Object.keys(lastrespectsIdentity).length > 64) lastrespectsIdentity = Object.create(null);
    });
    WorldCombat.on("world_combat:move_lastrespects/fallen", "world_combat:damage_applied", "", function (event) {
        const victim = event.target();
        if (victim === null) return;
        const world = event.world(), data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || !(data.after <= 0)) return;
        const ref = String(victim.ref());
        const cached = lastrespectsIdentity[ref];
        const identity = cached || { team: world.valid(victim) ? lastrespectsTeam(world, victim) : "", owner: lastrespectsOwner(victim), species: lastrespectsSpecies(victim) };
        lastrespectsRecord(world.tick(), identity);
    });

    actionParameters.define(lastrespectsId, {
        fallen: formula(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")), "倒下伙伴数", {
            unit: "位", description: "当前仍在记忆窗口内的同阵营倒下记录；没有现场时显示需要现场确认。"
        }),
        /** 扫墓威力：48 + 倒下伙伴 ×50（封顶 +250）+ 物攻偏移[−8,24] + 等级偏移[−2,6]；随行 ×0.85 / 送行 ×1.1；夹 46..320。 */
        mourn: formula(
            F.base(48)
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(50).clamp(0, 250).as(text("worldcombat.skill.lastrespects.value.mourned")))
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-8, 24))
                .plus(F.level().minus(30).times(0.16).clamp(-2, 6))
                .times(F.when(F.pref("trail", text("worldcombat.skill.lastrespects.preference.trail")), F.const(0.85), F.const(1.1)))
                .clamp(46, 320).round(1),
            "扫墓威力", {
                unit: "威力",
                description: "这一扫的基准威力；**每有一位同阵营伙伴在本场倒下就加 50**（封顶 +250），物攻给分量、等级给底气。随行式每人 ×0.85、送行式 ×1.1。对手防御、相性与暴击在命中时另算。"
            }),
        /** 随行鬼影：2 + 倒下伙伴 ×3；夹 2..20。 */
        ghosts: formula(
            F.base(2).plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(3)).clamp(2, 20).round(0),
            "随行鬼影", {
                unit: "道",
                description: "从地里升起、随这一扫一起走的鬼影数；倒下的伙伴越多，送行的人越多，画面里的鬼影和这里的数一致。"
            }),
        /** 送葬距离：3.4 格 + 速度偏移[−0.6,1.5] + 等级偏移[0,0.6] + 倒下伙伴 ×0.08（封顶 0.6）；夹 3..6.5。 */
        reach: formula(
            F.base(3.4).plus(F.stat("speed").minus(55).times(0.016).clamp(-0.6, 1.5))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.6))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.08).clamp(0, 0.6))
                .clamp(3, 6.5).round(2),
            "送葬距离", {
                unit: "格",
                description: "这一扫能从多远开始迈步到命中，也是本招的实际射程来源；腿快、等级高、送行的人多，都让它走得远一点。"
            }),
        /** 行进速度：0.7 格/刻 + 速度偏移[−0.15,0.4]；夹 0.5..1.3。 */
        speed: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.15, 0.4)).clamp(0.5, 1.3).round(2),
            "行进速度", {
                unit: "格/刻",
                description: "送葬队列每刻前进的距离；出手快的个体走得稳而快。"
            }),
        /** 扫过宽度：0.5 格 + 体型宽度偏移[−0.08,0.28] + 倒下伙伴 ×0.03（封顶 0.3）；随行 ×1.5；夹 0.4..1.3。 */
        width: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.2).clamp(-0.08, 0.28))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.03).clamp(0, 0.3))
                .times(F.when(F.pref("trail", text("worldcombat.skill.lastrespects.preference.trail")), F.const(1.5), F.const(1)))
                .clamp(0.4, 1.3).round(2),
            "扫过宽度", {
                unit: "格",
                description: "这一扫沿途覆盖的半宽；身体越宽、送行的人越多，扫得越开，随行式再 ×1.5。宽度画出来，判定就是那么宽。"
            }),
        /** 顶开距离：0.35 格 + 物攻偏移[−0.08,0.3] + 倒下伙伴 ×0.03（封顶 0.3）；夹 0.2..0.9。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.08, 0.3))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.03).clamp(0, 0.3))
                .clamp(0.2, 0.9).round(2),
            "顶开距离", {
                unit: "格",
                description: "被这一扫顶开多远；物攻越高、送行的人越多，捶得越开。"
            }),
        /** 起手：7 刻 − 速度偏移[−1,2] + 倒下伙伴 ×0.15（封顶 1.2）；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.15).clamp(0, 1.2))
                .clamp(4, 12).round(0),
            "起手", "低头默立、等伙伴的悔恨升起来的时间；送行的人越多越沉，速度快的个体起得利落。"),
        /** 收招：9 刻 − 速度偏移[−1,2]；夹 5..14。 */
        settle: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 14).round(0),
            "收招", "扫完站定、让鬼影散去的时间。"),
        /** 冷却：26 − 速度偏移[−3,5] + 倒下伙伴 ×0.8（封顶 5）+ 随行 4；夹 16..44。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.var("lastrespects.fallen", text("worldcombat.skill.lastrespects.value.fallen")).times(0.8).clamp(0, 5))
                .plus(F.when(F.pref("trail", text("worldcombat.skill.lastrespects.preference.trail")), F.const(4), F.const(0)))
                .clamp(16, 44).round(0),
            "冷却", "这一次扫墓之后多久能再扫；送行的人越多、走得越远，回得越慢，随行式更费。")
    });

    defineDamage(lastrespectsId, "mourn", { defenceCoefficient: 0.0045,
        rationale: "送行的重扫从身体内部震开，对正面护甲的穿透略强于默认，让倒下伙伴数的差别更可见。" }, {});

    stages(lastrespectsId, [
        { level: 30, values: { mourn: 62, reach: 3.8 } },
        { level: 46, values: { mourn: 78, reach: 4.2, ghosts: 5 } }
    ]);

    describe(lastrespectsId, [
        { key: "description.0", values: ["mourn","fallen"] },
        { key: "description.1", values: ["reach","speed","width","push"] },
        { key: "trail.on", values: [], when: function (context) { return read(context.detail.values, ["trail"]) === true; } },
        { key: "trail.off", values: [], when: function (context) { return read(context.detail.values, ["trail"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.mourn", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.mourn", "tier.1.reach"] }
    ]);
}

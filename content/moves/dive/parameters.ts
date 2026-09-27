/**
 * 潜水 / Dive — 参数、伤害段与说明来源。
 *
 * 原生：Water／Physical／威力 80／命中 100／PP 10／优先度 0；第 1 回合下潜，第 2 回合浮上来攻击。
 * 即时战斗里“两回合”换成一段真实的水路：只在可容纳身体的真实水体里下潜，锁一条最多现射程的连通水路／出水点，
 * 本体先下沉后逐段做真实碰撞移动；末端沿真实出水短段窜出，首个挡在前面的敌人吃一记，落空则留在实际水内安全点。
 * 选取是 aim：可以锁实体，也可以锁一个空点真实换位。落点在下潜那一刻锁死，目标在准备与行进期间移开，这一击
 * 就会落空，不会追着改点。
 *
 * 世界参与（非战斗条件）：只有身在水里、且水位容得下身体时才能下潜；软地不再算深潜。窜出落点会浇灭自己与
 * 目标身上的火，不再留下常驻涌泉。
 *
 * 配置 `deep`：深潜更远更强、下潜与冷却更久；急袭更短更弱、出手与冷却更快。两个方向各有取舍。
 *
 * 数值来源（每个参数取不同精灵数据，公式即悬浮说明里展开的那一棵）：
 *   power           = (基础 80 + (物攻 − 60) × 0.30，夹在 0..+40) × 下潜深度倍率（深潜 1.12／急袭 0.85）。
 *   launch          = 基础 0.6 格 × ∛(体重 / 400)（夹在 0.8..1.5）× 深度倍率（深潜 1.1／急袭 0.8）。
 *   push            = 基础 0.7 格；等级阶梯 25/50 级提升。
 *   submergeTicks   = 8 × √(80 / 速度)（夹在 0.5..1.75）× 深度倍率（深潜 1.15／急袭 0.7），夹在 3..16 刻。
 *   surgeSpeed      = 2 + 速度 / 80 格/刻：本体在水路中逐段推进的速度。
 *   lockRadius      = 基础 2.4 + (碰撞箱高度 − 1.4) × 0.8：窜出能罩住的落点范围。
 *   collisionRadius = 基础 0.3 + (碰撞箱高度 − 1.4) × 0.2。
 *   waterBonus      = 固定 25%：身在水里发动时的整体加成。
 * 伤害段名就是参数名 power，详情页伤害预览随物攻变化。
 */
namespace PokemonSkills {
    /** 配置项的值：深潜（true）与急袭（false）。 */
    export function diveDeep(config: any): boolean { return !!config.deep; }
    function diveWaterFluid(fluid: CombatFluid | null): boolean {
        return fluid !== null && !fluid.empty() && (fluid.tagged("minecraft:water") || String(fluid.id()) === "minecraft:water"
            || String(fluid.id()) === "minecraft:flowing_water");
    }
    /** 真实水流体高度；waterlogged 固体仍由完整身体碰撞检查拒绝。 */
    export function diveWaterBlock(world: CombatWorld, point: CombatPoint): boolean {
        const fluid = world.fluid(point);
        return diveWaterFluid(fluid) && point.y() <= Math.floor(point.y()) + fluid!.height() + .01;
    }
    export function diveFeet(body: CombatObservation): CombatPoint {
        return WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
    }
    /** 检查完整身体覆盖的每个流体格及其实际液面高度，并核对原生方块净空。 */
    export function diveWaterVolume(world: CombatWorld, body: CombatObservation, feet: CombatPoint): boolean {
        const extent = body.boundsMax().minus(body.boundsMin()), eps = .015;
        const lowX = feet.x() - extent.x() / 2 + eps, highX = feet.x() + extent.x() / 2 - eps;
        const lowZ = feet.z() - extent.z() / 2 + eps, highZ = feet.z() + extent.z() / 2 - eps;
        const lowY = feet.y() + eps, highY = feet.y() + extent.y() - eps;
        if (!world.freeSpace(feet, body.width(), body.height())) return false;
        for (let x = Math.floor(lowX); x <= Math.floor(highX); x++)
            for (let z = Math.floor(lowZ); z <= Math.floor(highZ); z++)
                for (let y = Math.floor(lowY); y <= Math.floor(highY); y++) {
                    const fluid = world.fluid(WorldCombat.point(x + .5, y + .5, z + .5));
                    if (!diveWaterFluid(fluid) || Math.min(highY, y + 1) > y + fluid!.height() + .015) return false;
                }
        return true;
    }
    /** 原下沉预算内找到真正能容纳全身的水位，保留原生床底限制。 */
    export function diveEntry(world: CombatWorld, body: CombatObservation): CombatPoint | null {
        const from = diveFeet(body), down = Math.min(.6, body.height() * .4);
        let found: CombatPoint | null = null;
        for (let step = 0; step <= Math.ceil(down / .1); step++) {
            const feet = from.minus(WorldCombat.point(0, Math.min(down, step * .1), 0));
            if (!world.freeSpace(feet, body.width(), body.height())) break;
            if (diveWaterVolume(world, body, feet)) found = feet;
        }
        return found;
    }
    /** 开放水面的真实高度；低顶下是水下通道，没有可冒充的水面波纹。 */
    export function diveWaterSurface(world: CombatWorld, point: CombatPoint, rise: number): CombatPoint | null {
        const base = Math.floor(point.y()), limit = Math.ceil(point.y() + rise);
        for (let y = base; y <= limit; y++) {
            const fluid = world.fluid(WorldCombat.point(point.x(), y + .5, point.z()));
            if (!diveWaterFluid(fluid)) return null;
            const at = WorldCombat.point(point.x(), y + fluid!.height(), point.z());
            if (diveWaterBlock(world, at.plus(WorldCombat.point(0, .03, 0)))) continue;
            const clip = world.clipBlocks(at.plus(WorldCombat.point(0, .015, 0)), at.plus(WorldCombat.point(0, .15, 0)));
            return clip !== null && !clip.blocked() ? at : null;
        }
        return null;
    }
    export function diveSubmerged(world: CombatWorld | null | undefined, actor: CombatActor | null | undefined): boolean {
        if (!world || !actor) return true;
        const body = world.observe(actor);
        return body !== null && (diveWaterBlock(world, body.position()) || diveWaterBlock(world, diveFeet(body).plus(WorldCombat.point(0, .1, 0))));
    }
    export function diveSubstantial(world: CombatWorld, actor: CombatActor): boolean {
        const body = world.observe(actor); return body !== null && diveEntry(world, body) !== null;
    }
    /** 深潜（true）与急袭（false）在这个参数上的倍率，配置分支在悬浮里展开。 */
    function diveDepth(deep: number, rush: number): Formula.Node {
        return F.when(F.pref("deep"), F.const(deep), F.const(rush));
    }

    actionParameters.define("dive", {
        /** 窜出威力：(80 + (物攻 − 60) × 0.30) × 深度倍率。 */
        power: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(0, 40))
                .times(diveDepth(1.12, 0.85))
                .clamp(58, 170).round(1),
            "潜水威力", {
                unit: "威力",
                description: "窜出这一击的基础威力；物攻越高越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 顶飞高度：0.6 × ∛(体重 / 400) × 深度倍率。 */
        launch: formula(
            F.base(0.6)
                .times(F.body("weight").div(400).pow(0.3333).clamp(0.8, 1.5))
                .times(diveDepth(1.1, 0.8))
                .clamp(0.3, 1.6).round(2),
            "顶飞高度", {
                unit: "格",
                description: "窜出把目标向上顶起的高度；体重越大撞得越高。"
            }),
        push: n(0.7, "推开距离", " 格"),
        /** 下潜延迟：8 × √(80 / 速度) × 深度倍率，夹在 3..16 刻。 */
        submergeTicks: formula(
            F.base(8)
                .times(F.const(80).div(F.stat("speed").max(1)).pow(0.5).clamp(0.5, 1.75))
                .times(diveDepth(1.15, 0.7))
                .clamp(3, 16).round(0),
            "下潜延迟", {
                unit: "刻",
                description: "本体下沉、开始沿水路推进前的等待；速度越快越短。这也是目标走出锁定半径的窗口。"
            }),
        /** 水路推进速度：2 + 速度 / 80 格/刻。 */
        surgeSpeed: formula(
            F.base(2).plus(F.stat("speed").div(80)).clamp(1.2, 4).round(2),
            "水路推进速度", {
                unit: "格/刻",
                description: "本体在水路中每刻游多远；速度越快这条线越难躲。画面里的水痕与它同轨。"
            }),
        /** 锁定半径：2.4 + (碰撞箱高度 − 1.4) × 0.8 格。 */
        lockRadius: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.8)).clamp(1.8, 4).round(2),
            "锁定半径", {
                unit: "格",
                description: "窜出能罩住的落点范围；目标在水路到达前退到这个半径外，这一击就会扑空。"
            }),
        /** 窜出判定半径：0.3 + (碰撞箱高度 − 1.4) × 0.2 格。 */
        collisionRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.2)).clamp(0.25, 0.8).round(2),
            "窜出判定半径", {
                unit: "格",
                description: "窜出这一下贴到目标身上的横向判定；身体越高大越大。"
            }),
        waterBonus: ratio(0.25, "水中加成")
    });

    defineDamage("dive", "power", {
        rationale: "单体贴身突袭：本体沿真实水路隐蔽接近，再从水缘窜出把目标顶飞；水路被挡或出水不到敌就空放。"
    }, { contact: true });

    stages("dive", [
        { level: 25, values: { push: 0.85 } },
        { level: 50, values: { push: 1.0 } }
    ]);

    describe("dive", [
        { key: "description.0", values: ["power","launch","push"] },
        { key: "description.1", values: ["submergeTicks","lockRadius","waterBonus"] },
        { key: "description.2", values: [] },
        { key: "stance.deep", values: [], when: function (context) { return !!read(context.detail.values, ["deep"]); } },
        { key: "stance.rush", values: [], when: function (context) { return !read(context.detail.values, ["deep"]); } },
        { key: "timing", values: ["recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.push"], when: function (context) { return context.pokemon.level() >= 25; } },
        { key: "growth.1", values: ["tier.1.level", "tier.1.push"], when: function (context) { return context.pokemon.level() >= 50; } }
    ]);
}

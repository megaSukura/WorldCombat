/**
 * 潜水 / Dive — 参数、伤害段与说明来源。
 *
 * 原生：Water／Physical／威力 80／命中 100／PP 10／优先度 0；第 1 回合下潜，第 2 回合浮上来攻击。
 * 即时战斗里“两回合”换成两段可读的节奏：先在落点处下潜（提交前的预告），提交后一道水痕掠过地面冲向
 * 锁定的落点，再从目标脚边窜出。落点在下潜那一刻锁死，目标在准备与水痕行进期间移开，这一击就会落空。
 *
 * 世界参与（非战斗条件）：能“潜”的地面才给深潜——脚下是软土（泥土、沙、砾石、苔、雪）或身在水里
 * 时，射程、威力与顶飞都更高；站在石地、木板等硬地上只能做一次短促的浅袭。这条判断同时驱动
 * `resolve` 的实际射程（AI 的 reach 跟着变）与 execute 的强度。
 * 窜出的落点会留下一汪真实涌泉（世界区域 world_combat:field/dive_spring）：走过的人被浇灭灼伤，
 * 范围内的地面火被永久浇灭（world.breakBlock，火是消耗品，灭了不会再烧回来）；这是这招留在世界里
 * 的痕迹，别人（或别的招）可以接着用这块湿地。
 *
 * 配置 `deep`：深潜更远更强、下潜与冷却更久；急袭更短更弱、出手与冷却更快。两个方向各有取舍。
 *
 * 数值来源（每个参数取不同精灵数据，公式即悬浮说明里展开的那一棵）：
 *   power           = (基础 80 + (物攻 − 60) × 0.30，夹在 0..+40) × 下潜深度倍率（深潜 1.12／急袭 0.85）。
 *   launch          = 基础 0.6 格 × ∛(体重 / 400)（夹在 0.8..1.5）× 深度倍率（深潜 1.1／急袭 0.8）。
 *   push            = 基础 0.7 格；等级阶梯 25/50 级提升。
 *   submergeTicks   = 8 × √(80 / 速度)（夹在 0.5..1.75）× 深度倍率（深潜 1.15／急袭 0.7），夹在 3..16 刻。
 *   surgeSpeed      = 2 + 速度 / 80 格/刻：水痕掠地的速度。
 *   lockRadius      = 基础 2.4 + (碰撞箱高度 − 1.4) × 0.8：窜出能罩住的落点范围。
 *   collisionRadius = 基础 0.3 + (碰撞箱高度 − 1.4) × 0.2。
 *   waterBonus      = 固定 25%：身在水里发动时的整体加成（软地同样受益于“深潜”）。
 *   springRadius    = 基础 1.0 + (碰撞箱高度 − 1.4) × 0.6 格。
 * 伤害段名就是参数名 power，详情页伤害预览随物攻变化。
 */
namespace PokemonSkills {
    /** 配置项的值：深潜（true）与急袭（false）。 */
    export function diveDeep(config: any): boolean { return !!config.deep; }
    /** 脚下是不是能潜下去的软地：软土、雪、或者身在水里。世界观察不到时按"能潜"处理，避免详情页显示异常。 */
    export function diveSubmerged(world: CombatWorld | null | undefined, actor: CombatActor | null | undefined): boolean {
        if (!world || !actor) return true;
        var body = world.observe(actor);
        if (!body) return true;
        if (body.wet()) return true;
        var block = world.block(body.position().plus(WorldCombat.point(0, -0.4, 0)));
        if (!block) return false;
        var id = String(block.id()), tags = String(block.tags());
        var soft = ["dirt", "grass", "moss", "mud", "sand", "gravel", "farmland", "podzol", "mycelium", "clay", "snow", "water"];
        for (var i = 0; i < soft.length; i++) if (id.indexOf(soft[i]) >= 0 || tags.indexOf(soft[i]) >= 0) return true;
        return false;
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
                description: "下潜到水痕出发的等待；速度越快越短。这也是目标走出锁定半径的窗口。"
            }),
        /** 水痕速度：2 + 速度 / 80 格/刻。 */
        surgeSpeed: formula(
            F.base(2).plus(F.stat("speed").div(80)).clamp(1.2, 4).round(2),
            "水痕速度", {
                unit: "格/刻",
                description: "水痕贴地掠过、逼近落点的速度；速度越快这条线越难躲。"
            }),
        /** 锁定半径：2.4 + (碰撞箱高度 − 1.4) × 0.8 格。 */
        lockRadius: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.8)).clamp(1.8, 4).round(2),
            "锁定半径", {
                unit: "格",
                description: "窜出能罩住的落点范围；目标在水痕到达前退到这个半径外，这一击就会扑空。"
            }),
        /** 窜出判定半径：0.3 + (碰撞箱高度 − 1.4) × 0.2 格。 */
        collisionRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.2)).clamp(0.25, 0.8).round(2),
            "窜出判定半径", {
                unit: "格",
                description: "窜出这一下贴到目标身上的横向判定；身体越高大越大。"
            }),
        waterBonus: ratio(0.25, "水中加成"),
        /** 涌泉半径：1.0 + (碰撞箱高度 − 1.4) × 0.6 格。 */
        springRadius: formula(
            F.base(1.0).plus(F.body("height").minus(1.4).times(0.6)).clamp(0.7, 2.5).round(2),
            "涌泉半径", {
                unit: "格",
                description: "窜出后留在落点的涌泉罩住的范围；走过的人身上灼伤被浇灭。"
            }),
        springTicks: ticks(60, "涌泉存续", "窜出后留在落点的涌泉存在的时间：走过的人身上灼伤被浇灭，范围内的地面火被永久浇灭。")
    });

    defineDamage("dive", "power", {
        rationale: "单体贴身突袭：水痕先把落点暴露出来，再从目标脚边窜出把它顶飞；落点在水痕行进期间可被躲开。"
    }, { contact: true });

    stages("dive", [
        { level: 25, values: { push: 0.85 } },
        { level: 50, values: { push: 1.0 } }
    ]);

    describe("dive", [
        { key: "description.0", values: ["power", "launch", "push"] },
        { key: "description.1", values: ["submergeTicks", "lockRadius", "waterBonus"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["springRadius", "springTicks"] },
        { key: "stance.deep", values: [], when: function (context) { return !!read(context.detail.values, ["deep"]); } },
        { key: "stance.rush", values: [], when: function (context) { return !read(context.detail.values, ["deep"]); } },
        { key: "timing", values: ["recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.push"], when: function (context) { return context.pokemon.level() >= 25; } },
        { key: "growth.1", values: ["tier.1.level", "tier.1.push"], when: function (context) { return context.pokemon.level() >= 50; } }
    ]);
}

/**
 * 大地波动 / terrainpulse —— 参数、伤害段与场地读取。
 *
 * 核心念头：一脚顿地，把脚下这块地的脉动顺着地面送向目标。站上场地（电气／青草／薄雾／精神）时，
 * 波会带上那片场地的元素、威力翻倍；悬空时接不到地气，就只是一道普通的波。
 *
 * 数值来源（原生）：Normal／特殊／威力 50／命中 100／PP 10；在场地且接地时威力 ×2、属性随场地
 * （electricterrain→Electric、grassyterrain→Grass、mistyterrain→Fairy、psychicterrain→Psychic）。
 *
 * 场地读取：共享层以语义身份 `WorldEffects.terrain(<场地>)` 标记一片场地，四种场地招式与掀起同名场地的
 * surge 特性声明同一身份；本单元只查身份，不枚举任何生产者的规则 id。属性由伤害 `resolve` 读取，
 * 预览、AI 与命中同源。
 *
 * 事实接入：脚下是否有场地是自定义纯事实 `ground.charged`（`defineFacts`），供威力公式与悬浮共用。
 */
namespace PokemonSkills {
    export interface TerrainpulseTerrain { type: string; colour: number; }
    /**
     * 旧场地身份到元素/颜色的兼容映射：仅当一片场地没有在自己的 data 里声明 element/colour 时使用。
     * 生产者在新场地 data 里给出 `element`（属性 id）与 `colour`（主色），本单元优先读它，不枚举生产规则。
     */
    const terrainpulseLegacy: { [name: string]: TerrainpulseTerrain } = {
        electricterrain: { type: "electric", colour: 0xF8D030 },
        grassyterrain: { type: "grass", colour: 0x78C850 },
        mistyterrain: { type: "fairy", colour: 0xEE99AC },
        psychicterrain: { type: "psychic", colour: 0xF85888 }
    };
    function terrainpulseName(identity: string): string { var slash = identity.lastIndexOf("/"); return slash >= 0 ? identity.substring(slash + 1) : identity; }
    /** 一片场地的元素与主色：优先场地 data.element/colour，旧场地回落到身份映射；无法识别时 null。 */
    function terrainpulseTerrainOf(area: WorldEffects.Area): TerrainpulseTerrain | null {
        var data = area.data || {};
        var legacy = terrainpulseLegacy[terrainpulseName(String(area.identity || ""))];
        var type = typeof data.element === "string" && data.element.length > 0 ? data.element : legacy ? legacy.type : null;
        if (type === null) return null;
        var colour = typeof data.colour === "number" ? data.colour : typeof data.color === "number" ? data.color : legacy ? legacy.colour : 0x9AA0A8;
        return { type: type, colour: colour };
    }
    /**
     * 覆盖真实脚点、且在同楼层的最新生效场地：`areasWithTag` 已排待生效，`surfaceTouches` 用真实脚点与高度容差
     * 排别楼层。多个覆盖时取最新 id，不再按固定元素顺序抢先。
     */
    function terrainpulseFieldAt(world: CombatWorld | null, feet: CombatPoint | null, grounded: boolean): WorldEffects.Area | null {
        if (!world || !feet || !grounded) return null;
        var areas = WorldEffects.areasWithTag(world, WorldEffects.categories.terrain), best: WorldEffects.Area | null = null;
        for (var i = 0; i < areas.length; i++) {
            var area = areas[i];
            if (!WorldEffects.surfaceTouches(area, feet, 0, 1)) continue;
            if (best === null || area.id > best.id) best = area;
        }
        return best;
    }
    /** 观察到的战斗者脚下场地的元素；悬空、脚下无场地或无法识别时 null。 */
    export function terrainpulseTerrainAt(world: CombatWorld | null, actor: CombatActor | null): TerrainpulseTerrain | null {
        if (!world || !actor || !world.valid(actor)) return null;
        var body = world.observe(actor);
        if (!body || !body.grounded()) return null;
        var feet = WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
        var area = terrainpulseFieldAt(world, feet, true);
        return area === null ? null : terrainpulseTerrainOf(area);
    }
    /** AI 用的点版本：调用方给出真实支撑脚点与接地事实，语义与上面的观察版本一致。 */
    export function terrainpulseTerrainAtPoint(world: CombatWorld | null, feet: CombatPoint | null, grounded: boolean): TerrainpulseTerrain | null {
        var area = terrainpulseFieldAt(world, feet, grounded);
        return area === null ? null : terrainpulseTerrainOf(area);
    }
    defineFacts("terrainpulse", function (context: FactContext): Formula.Facts {
        function charged(): boolean { return !!terrainpulseTerrainAt(context.world || null, context.actor || null); }
        return {
            read: function (id: string): Formula.Fact {
                if (id === "ground.charged") return charged();
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "ground.charged") return undefined;
                return { value: charged() ? 1 : 0,
                    label: { key: "worldcombat.skill.terrainpulse.value.charged" }, terms: [] };
            }
        };
    });

    actionParameters.define("terrainpulse", {
        // 威力 = 50 + 特攻成长；接地且有场地时 ×2，共鸣时每一波 ×0.7。
        pulse: formula(
            F.base(50).plus(F.stat("specialAttack").minus(60).times(0.2))
                .times(F.when(F.var("ground.charged", { key: "worldcombat.skill.terrainpulse.value.charged" }), F.const(2), F.const(1)))
                .times(F.when(F.pref("resonate"), F.const(0.7), F.const(1)))
                .clamp(35, 170).round(1),
            "威力", { base: 50, unit: "威力", description: "接地且站在场地上时 ×2；共鸣时每一波 ×0.7。对手防御、相性与暴击在命中时另算。" }),
        // 顿地时间：速度快顿得早。
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(4, 15).round(0),
            "顿地时间", "把地气收进这一脚需要多久；手快的人更短。"),
        // 施放距离：等级越高能推得越远。
        reach: formula(
            F.base(11).plus(F.level().minus(20).max(0).times(0.08)).clamp(9, 20).round(1),
            "施放距离", { unit: " 格", description: "波能沿地面推到多远；等级越高越远。" }),
        // 波速：速度决定沿地面推进的快慢。
        velocity: formula(
            F.base(1.0).plus(F.stat("speed").minus(40).max(0).times(0.007)).clamp(0.8, 1.6).round(2),
            "波速", { unit: " 格/刻", description: "波沿地面推进的速度；越快越难躲。" }),
        // 判定半径：体型高度决定波的覆盖高度与粗细。
        radius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).max(0).times(0.1)).clamp(0.3, 0.66).round(2),
            "判定半径", { unit: " 格", description: "波的碰撞半径；高个子的波更粗。" }),
        // 爆发数量：直接驱动命中粒子，随威力增长。
        bursts: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).max(0).times(0.16))
                .times(F.when(F.var("ground.charged", { key: "worldcombat.skill.terrainpulse.value.charged" }), F.const(1.5), F.const(1)))
                .clamp(12, 48).round(0),
            "爆发数量", { unit: " 个", description: "命中处炸起的粒子数量；特攻越高、场地加持时越密。粒子按它发射。" }),
        // 地环半径：命中处那道贴地环的半径，也用于共鸣第二波的作用半径。
        ring: formula(
            F.base(1.2).plus(F.level().minus(20).max(0).times(0.02)).clamp(1.2, 2.4).round(2),
            "地环半径", { unit: " 格", description: "实际接触点的表现地环半径；共鸣仍由相邻两道有限地脉结算。" })
    });

    defineDamage("terrainpulse", "pulse", { defenceCoefficient: 0.0046, rationale: "地脉推进穿透略强，让场地与特攻的差别更可见。" }, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (!damage.world || !damage.actor) return undefined;
            var terrain = terrainpulseTerrainAt(damage.world, damage.actor);
            return terrain ? { type: terrain.type } : undefined;
        }
    });
    describe("terrainpulse", [
        { key: "description.0", values: ["pulse"] },
        { key: "description.1", values: ["charge","reach"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}

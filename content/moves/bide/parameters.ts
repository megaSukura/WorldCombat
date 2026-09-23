/**
 * 忍耐 / bide —— 参数、记账与结算。
 *
 * 原生事实：Normal／物理／威力 0（伤害回调）／命中必中／PP 10／优先度 +1／接触；条件 duration 2，
 *   期间 onDamage 累计受到的招式伤害并记住最后来源，结束时把 totalDamage ×2 还给来源（无来源或 0 则失败）；
 *   「在２回合内忍受攻击，受到的伤害会２倍返还给对手」（Cobblemon 1.8）。
 *
 * 翻译：回合制的「忍两回合再还手」在即时战斗里是一段**站定忍耐**——进入架势后这段时间里挨到的每一记
 *   （不论物理、特殊还是别的来源）都记进账本，按自身最大生命设上限；忍耐时间走完自动把账上的伤害加倍
 *   还给最后打自己的人（够不到就找最近的敌人），空忍、或被外力打断则落空。
 *   与同族分开：双倍奉还只认物理、要你主动迎击；镜面反射只认特殊、隔空射回；忍耐全吃、要站定、自动还。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   window        忍耐时长随速度与等级（站得越稳越久）；扎根式更长。
 *   capFraction   账本上限比例随防御与特防（身板越硬，能攒下的越多）。
 *   payback       返还伤害 = 账本伤害 ×（2 + 越接近倒下越重的加成）；读当前生命比例与账本。
 *   releaseReach  够得到的距离随体型高度与速度。
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级；扎根式起手更慢。
 */
namespace PokemonSkills {
    export const bideId = "bide";
    export const bideScene = "world_combat:move_bide";
    export const bideBraceEffect = "world_combat:bide_brace";
    export const bideBraceText = "world_combat.move.bide.text.brace";
    export const bideReleaseText = "world_combat.move.bide.text.release";
    export const bideWhiffText = "world_combat.move.bide.text.whiff";
    export const bideBrokenText = "world_combat.move.bide.text.broken";

    export interface BideRecord { amount: number; cap: number; window: number; start: number; source: string; active: boolean; }
    export var bideLedger: { [ref: string]: BideRecord } = Object.create(null);

    /** 进入忍耐架势：清掉旧账，按这次施放的上限开一本新账。 */
    export function bideBegin(world: CombatWorld, actor: CombatActor, cap: number, window: number): void {
        bideLedger[String(actor.ref())] = { amount: 0, cap: cap, window: window, start: world.tick(), source: "", active: true };
    }
    /** 当前账本；架势已经超期未结（被打断、动作异常结束）时视为无效并清除。 */
    export function bideRead(world: CombatWorld | null, actor: CombatActor | null): BideRecord | null {
        if (!world || !actor || !world.valid(actor)) return null;
        var ref = String(actor.ref()), record = bideLedger[ref];
        if (!record) return null;
        if (record.active && world.tick() - record.start > record.window + 40) { delete bideLedger[ref]; return null; }
        return record;
    }
    /** 结账并清除；返回结账前的账本，供还手读取。 */
    export function bideEnd(actor: CombatActor): BideRecord | null {
        var ref = String(actor.ref()), record = bideLedger[ref] || null;
        if (record) record.active = false;
        delete bideLedger[ref];
        return record;
    }
    /**
     * 忍耐的还手不走攻防公式：账上的伤害原样加倍，只按目标护甲削一次，属性免疫也不拦（native ignoreImmunity）。
     * 这是它与双倍奉还／镜面反射共享的「固定伤害结算」入口，但只有忍耐不看属性免疫。
     */
    export function bideRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        var world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        var armor = world.attributeValue(target, "minecraft:generic.armor");
        var toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        var metadata: any = { kind: "move", move: bideId, category: "physical", contact: contact, knockback: false,
            bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    // 忍耐记账：架势存续期内，任何外来伤害都记进账本，按上限截断，并记住最后打你的人。
    WorldCombat.on("world_combat:move_bide/absorb", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var victim = event.target();
        if (victim === null) return;
        var world = event.world();
        if (!world.valid(victim)) return;
        var record = bideLedger[String(victim.ref())];
        if (!record || !record.active) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        record.amount = Math.min(record.cap, record.amount + data.actual);
        if (source !== null) record.source = String(source.ref());
        var body = world.observe(victim);
        if (body !== null) WorldFeedback.emit(world, bideScene, 1, body.position(),
            { moment: "absorb", target: String(victim.ref()), charge: record.amount, cap: record.cap,
                motes: Math.max(6, Math.round(record.amount * 1.4)),
                intensity: Math.max(0.12, Math.min(1, record.amount / Math.max(1, record.cap))) }, 24);
    });

    defineFacts(bideId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "bide.stored") {
                var record = bideRead(context.world || null, context.actor || null);
                return record ? record.amount : 0;
            }
            return undefined;
        } };
    });

    actionParameters.define(bideId, {
        window: seconds(
            F.base(90).plus(F.stat("speed").minus(60).times(0.5).clamp(-12, 24))
                .plus(F.level().minus(20).max(0).times(1.0).clamp(0, 40))
                .times(F.when(F.pref("rooted", text("worldcombat.skill.bide.preference.rooted")), F.const(1.15), F.const(0.8)))
                .clamp(60, 240).round(0),
            "忍耐时长", "架势能站住多久；速度快的个体站得更稳、等级高更沉得住气。扎根式更长且这段时间不能走动。"),
        capFraction: percent(
            F.base(0.28).plus(F.stat("defence").minus(60).times(0.0018).clamp(-0.1, 0.22))
                .plus(F.stat("specialDefence").minus(60).times(0.0018).clamp(-0.1, 0.22)).clamp(0.15, 0.5).round(3),
            "账本上限", "账本最多能攒下自身最大生命的这个比例；防御与特防越高，身板越扛得住、能记下的越多。"),
        payback: formula(
            F.var("bide.stored", text("worldcombat.skill.bide.value.stored"))
                .times(F.base(2).plus(F.const(1).minus(F.actor("healthRatio")).times(0.6).clamp(0, 0.8))
                    .times(F.when(F.pref("rooted", text("worldcombat.skill.bide.preference.rooted")), F.const(1.1), F.const(0.9)))
                    .clamp(1.4, 2.8).as(text("worldcombat.skill.bide.value.ratio"))).round(0),
            "返还伤害", {
                unit: "点",
                description: "按已积累的伤害、当前生命与姿态算出的返还伤害总量；剩余生命越少还手越重，没有积累伤害时落空。"
            }),
        releaseReach: formula(
            F.base(6).plus(F.body("height").minus(1.4).times(1.2).clamp(-0.4, 1.8))
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.6, 1.4)).clamp(4, 12).round(1),
            "返还射程", { unit: "格", description: "还手能打到多远；身形越大、腿越快够得越远，追不上账主就找最近的敌人。" }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 4)).clamp(5, 12).round(0),
            "起手", "收住架势、把这一口忍下去需要多久；快个体收得更利落。"),
        settle: seconds(F.base(10).clamp(6, 16).round(0), "收招", "这一记还出去之后站定收势的时间。"),
        recharge: seconds(
            F.base(120).minus(F.level().minus(20).max(0).times(1.2).clamp(0, 60)).clamp(70, 180).round(0),
            "冷却", "两次忍耐之间的等待；等级越高越熟练。")
    });

    describe(bideId, [
        { key: "description.0", values: ["window","payback"] },
        { key: "description.1", values: ["capFraction", "releaseReach"] },
        { key: "description.release", values: [] },
        { key: "description.2", values: ["tempo", "settle", "recharge"] },
        { key: "rooted.on", values: [], when: function (context) { return read(context.detail.values, ["rooted"]) === true; } },
        { key: "rooted.off", values: [], when: function (context) { return read(context.detail.values, ["rooted"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] }
    ]);
}

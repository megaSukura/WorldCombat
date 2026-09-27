/**
 * 给附近符合传动条件的友方暂时提高攻击和特攻：正电、负电宝可梦，以及铁傀儡或手持金属工具的伙伴。
 * 资格在**施放这一刻**读一次：那一刻合格的人接上传动，之后即使放下工具、走出齿链范围，动力也留在身上直到真到期；
 * 反过来，施放之后才合格的不会被补上。资格只是这次快照的入口，不是每 tick 复查。
 *
 * 等级是**这次传动自己的临时窗口**：boostWindow 挂在真实状态载体 world_combat:gearup_drive 上，
 * 到期、被牛奶／`/effect clear` 解除、被重施替换时只收回这一份贡献，不碰别的来源留下的等级。
 * 第一次连接要求从施法者到受益者的真实通视；接上后离开范围不影响原窗口。
 */
namespace PokemonSkills {
    /** 资格来自当前正负电特性，或任何实体身上的铁傀儡身体/金属装备材料。 */
    export function gearupPolarity(world: CombatWorld, actor: CombatActor): string {
        if (!world.valid(actor)) return "";
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor);
            const name = String(NativeEffects.ability(pokemon, NativeEffects.read(world, actor))).replace("cobblemon:", "").toLowerCase();
            if (name === "plus" || name === "minus") return name;
        }
        const type = world.entityType(actor);
        if (type !== null && String(type.id()) === "minecraft:iron_golem") return "metal";
        const equipment = world.equipment(actor);
        for (let i = 0; i < equipment.length; i++) {
            const slot = String(equipment[i].slot());
            if ((slot === "mainhand" || slot === "offhand" || slot === "held") && NativeItems.magneticEquipment(equipment[i])) return "metal";
        }
        return "";
    }
    function gearupQualifies(world: CombatWorld, actor: CombatActor): boolean {
        return gearupPolarity(world, actor) !== "";
    }
    /** 这次传动真正抬到的攻击/特攻级数；window 是这份贡献自己的临时窗口 id。 */
    export interface GearupDrive { window: number; atk: number; spa: number; }

    /**
     * 给一个合格友方挂上传动载体并开一份属于这次的攻击/特攻窗口；已经在转的人不重复叠加。
     * 先让载体应用成功，窗口再绑到它上面；一样都没真抬到等级时不留载体、不播成功。
     */
    function gearupGrant(world: CombatWorld, actor: CombatActor, drive: number, spark: number, ticks: number): GearupDrive | null {
        if (MobEffects.read(world, actor, gearupEffect) !== null) return null;
        const before = NativeEffects.effectiveStages(world, actor);
        const carrier = MobEffects.apply(world, actor, gearupEffect, ticks, 0);
        if (carrier === null) return null;
        const owned = NativeEffects.boostWindow(world, actor, { atk: drive, spa: spark }, ticks,
            "world_combat:move/gearup", carrier, null);
        if (!owned) { world.removeMobEffect(actor, carrier.id(), carrier.key()); return null; }
        const after = NativeEffects.effectiveStages(world, actor);
        const atk = Math.max(0, (after.atk || 0) - (before.atk || 0));
        const spa = Math.max(0, (after.spa || 0) - (before.spa || 0));
        if (atk === 0 && spa === 0) { world.removeMobEffect(actor, carrier.id(), carrier.key()); return null; }
        return { window: owned, atk: atk, spa: spa };
    }

    // 动力散去、被人解除：只播画面与收束文字；等级贡献由窗口自己收回，不再人工倒扣。
    WorldCombat.on("world_combat:move_gearup/revert", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== gearupEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, gearupEffect) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, gearupScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), gearupFadeText, [], 22);
    });

    define({
        id: gearupId,
        cooldownParameter: "wait",
        name: "辅助齿轮",
        description: "给附近符合传动条件的友方暂时提高攻击和特攻：正电、负电宝可梦，以及铁傀儡或手持金属工具的伙伴。资格只在施放这一刻结算一次；接上的人之后放下工具或走出范围，动力也留到结束。",
        uses: ["为正负电伙伴、铁傀儡或持金属工具的队友提高攻击", "在近身缠斗前把输出拉起来", "让带正负电特性的队友一起变强"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "gear",
        stationary: true,
        defaults: { steady: 0, ai: { maxChase: 12, pack: 4 } },
        fields: [
            field(pathOf("steady"), "传动", "choice", {
                options: [
                    { value: 1, label: "稳啮" },
                    { value: 0, label: "超速" }
                ],
                help: "稳啮：攻击与特攻各 +1、齿链 ×1.15 宽、运转 ×1.25 久，但起手 +3 刻、冷却 ×1.12；超速：起手与冷却更省，齿链 ×0.8 短、运转更短、等级按本体。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[gearupId], detail: { values: config } };
            return { radius: p(gearupId, "chain", context), geometry: "area", style: "gear", color: 0xC8CDD3,
                label: config && Number(config.steady) === 1 ? "辅助齿轮 · 稳啮" : "辅助齿轮 · 超速" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[gearupId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(2, Math.round(p(gearupId, "tempo", context))),
                recover: Math.max(3, Math.round(p(gearupId, "aftercast", context))),
                cooldown: Math.round(p(gearupId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            const steady = config && Number(config.steady) === 1 ? 1 : 0;
            const teeth = Math.max(12, Math.round(p(gearupId, "teeth", action)));
            action.present("world_combat:move_gearup:spin", gearupScene, 1, action.origin(),
                JSON.stringify({ moment: "spin", teeth: teeth, steady: steady }));
            action.present("world_combat:move_gearup:gear", gearupGearScene, 1, action.origin(),
                JSON.stringify({ teeth: teeth, steady: steady }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const drive = Math.max(1, Math.min(2, Math.round(p(gearupId, "drive", action))));
            const spark = Math.max(1, Math.min(2, Math.round(p(gearupId, "spark", action))));
            const chain = Math.max(1.2, p(gearupId, "chain", action));
            const ticks = Math.max(120, Math.round(p(gearupId, "runTicks", action)));
            const teeth = Math.max(12, Math.round(p(gearupId, "teeth", action)));
            const steady = config && Number(config.steady) === 1 ? 1 : 0;
            const scale = chain / gearupReferenceRadius;
            const point = body.position();
            const selfRef = String(actor.ref());
            const linked: string[] = [];
            const actors = world.query(point, chain, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (!world.friendly(other) || !gearupQualifies(world, other)) continue;
                const obs = world.observe(other);
                if (obs === null) continue;
                // 齿链是实体连接：先经过真实通视才传动；墙后的人这一拍接不上。
                if (String(other.ref()) !== selfRef && !world.clear(point, obs.position())) continue;
                // 只有这次真正被传动上的伙伴才算受益人；已经在转的人不重复也反馈。
                const gain = gearupGrant(world, other, drive, spark, ticks);
                if (gain === null) continue;
                const ref = String(other.ref());
                linked.push(ref);
                WorldFeedback.emit(world, gearupScene, 1, obs.position(),
                    { moment: "drive", target: ref, drive: gain.atk, spark: gain.spa,
                      motes: Math.max(8, Math.round(teeth * 0.5)), scale: scale }, 28);
                // 持续动力绑在传动自己的窗口上：离开齿链范围不会掉，窗口真到期或被清除才收。
                WorldFeedback.onEffect(world, gain.window, "world_combat:move_gearup/drive/" + ref, gearupScene, 1, obs.position(),
                    { moment: "drive_hold", target: ref, drive: gain.atk, spark: gain.spa,
                      motes: Math.max(6, Math.round(teeth * 0.3)), scale: scale });
                WorldFeedback.text(world, obs.position().plus(WorldCombat.point(0, 1.25, 0)), gearupDriveText, [gain.atk, gain.spa], 28);
                if (ref !== selfRef) world.sound("cobblemon:impact.steel", obs.position(), 10, "{}");
            }
            const path: string[] = [];
            for (let i = 0; i < linked.length; i++) { path.push(selfRef); path.push(linked[i]); }
            world.sound("minecraft:block.anvil.hit", point, 14, "{}");
            world.sound("minecraft:block.copper_bulb.turn_on", point, 12, "{}");
            WorldFeedback.emit(world, gearupScene, 1, point,
                { moment: "mesh", radius: chain, teeth: teeth, drive: drive, spark: spark, links: linked.length,
                  path: path, scale: scale }, 40);
            WorldFeedback.emit(world, gearupGearScene, 1, point, { teeth: teeth, steady: steady }, 40);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.35, 0)), gearupSpinText,
                [drive, spark, linked.length, Math.round(ticks / 20)], 34);
            done(action);
        }
    });
}

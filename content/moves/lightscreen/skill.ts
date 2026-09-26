/**
 * 光墙 / lightscreen 的出手方式。
 *
 * 这不是罩住自己、跟着人走的穹顶，而是一面立在选定落点、朝向施放方向的有限柔光竖幕：
 *   起（windup，提交前）：落点聚起一圈光晕，预告幕要立的地方。
 *   立（execute → field）：在落点创建带 screen 标签的矩形场地；法线是施法者到落点的水平方向，
 *       下缘中点就是落点。幕面本身也把共享身份 world_combat:status/lightscreen 记在施法者身上，
 *       可被劈瓦／精神之牙／清除浓雾一类的破屏招清掉。
 *   护（incoming）：特殊伤害在结算前，按来袭弹体的**真实轨迹**或原生 sourcePosition→目标身体点
 *       与每面幕做交面判断。只有从幕外（+法线侧）穿到幕后（−法线侧）、且交点落在幕面宽高内的来袭，
 *       才按该幕的 cut 削减、按 damp 滤附带效果；同一时刻有多面幕命中只取最强一面，不累乘。
 *
 * 与同族分开：反射壁是随身携带的硬光板，极光幕是环境限定的驻守区；光墙是定点、有宽高、可穿行的竖幕。
 */
namespace PokemonSkills {
    /** 表现里的参考半宽：`data.scale = 实际半宽 / 这个数`。 */
    const lightscreenReferenceRadius = 3;
    StatusContributions.define(lightscreenEffect);

    function lightscreenPoint(position: number[]): CombatPoint {
        return WorldCombat.point(position[0], position[1], position[2]);
    }
    function lightscreenTuple(value: any): CombatPoint | null {
        if (!Array.isArray(value) || value.length !== 3) return null;
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        return isFinite(x) && isFinite(y) && isFinite(z) ? WorldCombat.point(x, y, z) : null;
    }
    function lightscreenAbove(point: CombatPoint, height: number): CombatPoint {
        return point.plus(WorldCombat.point(0, Math.max(0.4, height) + 0.4, 0));
    }
    /** 幕面四个实际角点：下缘中点为 field.position，法线在水平面内，宽度左右各半宽，向上幕高。 */
    function lightscreenCorners(position: number[], data: any): CombatPoint[] {
        const normal = data && data.normal;
        const nx = Array.isArray(normal) && normal.length === 3 ? Number(normal[0]) : 0;
        const nz = Array.isArray(normal) && normal.length === 3 ? Number(normal[2]) : 1;
        const length = Math.sqrt(nx * nx + nz * nz) || 1;
        const ux = nx / length, uz = nz / length;
        const half = Math.max(0.1, Number(data && data.width) || 0);
        const height = Math.max(0.1, Number(data && data.height) || 0);
        const base = lightscreenPoint(position);
        const side = WorldCombat.point(-uz, 0, ux).scale(half);
        const up = WorldCombat.point(0, height, 0);
        return [base.minus(side), base.plus(side), base.plus(side).plus(up), base.minus(side).plus(up)];
    }
    function lightscreenPath(corners: CombatPoint[]): number[][] {
        return corners.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }
    function lightscreenScale(width: number): number {
        return Math.max(0.5, Math.min(2.4, (Number(width) || lightscreenReferenceRadius) / lightscreenReferenceRadius));
    }
    /**
     * 真实交面点：段从幕外（+法线，fa>0）跨到幕后（−法线，fb<=0），交点在幕面半宽 x 幕高的矩形内，
     * 返回该点；否则 null。同侧来击与幕外命中都不返回点。
     */
    function lightscreenCross(position: number[], data: any, from: CombatPoint, to: CombatPoint): CombatPoint | null {
        const normal = data && data.normal;
        if (!Array.isArray(normal) || normal.length !== 3) return null;
        const nx = Number(normal[0]), nz = Number(normal[2]);
        const length = Math.sqrt(nx * nx + nz * nz);
        if (!(length > 1e-6)) return null;
        const ux = nx / length, uz = nz / length;
        const half = Number(data.width), height = Number(data.height);
        if (!(half > 0) || !(height > 0)) return null;
        const px = position[0], py = position[1], pz = position[2];
        const fa = (from.x() - px) * ux + (from.z() - pz) * uz;
        const fb = (to.x() - px) * ux + (to.z() - pz) * uz;
        if (!(fa > 0) || fb > 0) return null;
        const t = fa / (fa - fb);
        if (!(t >= 0 && t <= 1)) return null;
        const ix = from.x() + (to.x() - from.x()) * t;
        const iy = from.y() + (to.y() - from.y()) * t;
        const iz = from.z() + (to.z() - from.z()) * t;
        const across = (ix - px) * (-uz) + (iz - pz) * ux;
        if (Math.abs(across) > half) return null;
        if (iy < py || iy > py + height) return null;
        return WorldCombat.point(ix, iy, iz);
    }
    /**
     * 一处幕是否被这次来袭真实穿过。投射物只认截至接触时保存的真实轨迹段（同当前 sourceEntity、不早于幕的创建刻）；
     * 没有轨迹就不假称穿幕。非投射物用已知 sourcePosition 到目标身体点做同一条交面检查。
     */
    function lightscreenCrossing(world: CombatWorld, area: WorldEffects.Area, target: CombatActor, data: any): CombatPoint | null {
        const body = world.observe(target);
        if (body === null) return null;
        const to = body.position();
        if (data.directProjectile === true) {
            const created = Number(area.data && area.data.created) || 0;
            const source = String(data.sourceEntity || "");
            const path = Array.isArray(data.projectilePath) ? data.projectilePath : [];
            for (let i = 0; i < path.length; i++) {
                const segment = path[i];
                if (!segment || typeof segment.tick !== "number" || segment.tick < created) continue;
                if (source && String(segment.ownerEntity || "") !== source) continue;
                const from = lightscreenTuple(segment.from), to2 = lightscreenTuple(segment.to);
                if (from === null || to2 === null) continue;
                const hit = lightscreenCross(area.position, area.data, from, to2);
                if (hit !== null) return hit;
            }
            return null;
        }
        const source = data.sourcePosition;
        if (!Array.isArray(source) || source.length !== 3) return null;
        const from = lightscreenTuple(source);
        if (from === null) return null;
        return lightscreenCross(area.position, area.data, from, to);
    }
    /** 命中这次来袭的幕里取最强一面：cut 大优先、同值 id 小先；没有则 null。 */
    function lightscreenStrongest(world: CombatWorld, victim: CombatActor, data: any): { area: WorldEffects.Area; cut: number; damp: number; point: CombatPoint } | null {
        const areas = WorldEffects.areas(world, lightscreenMark);
        let best: { area: WorldEffects.Area; cut: number; damp: number; point: CombatPoint } | null = null;
        for (let i = 0; i < areas.length; i++) {
            const area = areas[i];
            const owner = world.actor(area.source);
            if (owner === null || !world.allied(owner, victim)) continue;
            const value = area.data || {};
            const cut = Math.max(0, Math.min(0.8, Number(value.cut) || 0));
            if (cut <= 0) continue;
            if (best !== null && cut < best.cut) continue;
            if (best !== null && cut === best.cut && area.id > best.area.id) continue;
            const point = lightscreenCrossing(world, area, victim, data);
            if (point === null) continue;
            best = { area: area, cut: cut, damp: Math.max(0, Math.min(0.95, Number(value.damp) || 0)), point: point };
        }
        return best;
    }

    // 幕的场地规则：登记共享 screen 类别，持续画面由场地自己拥有；施法者身上带共享身份载体。
    WorldEffects.fieldRule(lightscreenMark, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const caster = effect.source();
            if (!world.valid(caster)) return;
            const data: any = field.data || {};
            const remaining = typeof field.remaining === "number" ? field.remaining : effect.remaining();
            StatusContributions.upsert(world, caster, lightscreenEffect, String(effect.id()),
                { cut: data.cut, damp: data.damp, width: data.width, height: data.height, motes: data.motes, thick: data.thick },
                Math.max(1, Math.round(remaining)),
                { owner: { id: effect.id(), definition: "world_combat:field", target: String(caster.ref()) } });
            const corners = lightscreenCorners(field.position, data);
            const scale = lightscreenScale(data.width);
            world.present("world_combat:move_lightscreen/field/" + effect.id(), lightscreenScene, 1, lightscreenPoint(field.position),
                JSON.stringify({ moment: "hold", path: lightscreenPath(corners), motes: Math.max(1, Math.round(Number(data.motes) || 16)),
                    braces: data.thick ? 8 : 0, scale: scale }));
            if (remaining <= 40 && data.faded !== true) {
                data.faded = true;
                WorldFeedback.emit(world, lightscreenScene, 1, lightscreenPoint(field.position),
                    { moment: "fade", motes: data.motes, braces: data.thick ? 6 : 0, scale: scale }, 40);
                WorldFeedback.text(world, lightscreenAbove(lightscreenPoint(field.position), Number(data.height) || 2), lightscreenFadeText, [], 34);
            }
            field.data = data;
        }
    }, { identity: WorldEffects.screen("lightscreen"), tags: [WorldEffects.categories.screen], transferable: true });

    // 载体被牛奶或 /effect clear 清掉时，收掉它名下还在的幕；天然到期由贡献的 owner 绑定另行清理。
    WorldCombat.on("world_combat:move_lightscreen/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== lightscreenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, lightscreenEffect) !== null) return;
        const areas = WorldEffects.areas(world, lightscreenMark);
        for (let i = 0; i < areas.length; i++) {
            if (String(areas[i].source) !== String(actor.ref())) continue;
            world.operation(areas[i].id, "world_combat:dispel", "{}");
        }
    });

    /** 特殊结算点：只有从幕外穿过幕面、打向幕后友方的特殊伤害被削，附带效果被滤淡；同侧不凭位置白减。 */
    NativeEffects.incomingRules.define({ id: "world_combat:move_lightscreen/veil", apply: function (hit: NativeEffects.Hit) {
        const data = hit.data;
        if (!data || data.bypassesInvulnerability || !(data.amount > 0)) return;
        if (DamageSemantics.read(data).category !== "special") return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target)) return;
        const best = lightscreenStrongest(world, target, data);
        if (best === null) return;
        const before = data.amount;
        const blocked = before * best.cut;
        data.amount = Math.max(0, before - blocked);
        let damped = false;
        if (typeof data.chance === "number" && data.chance > 0 && best.damp > 0) {
            data.chance = Math.max(0, data.chance * (1 - best.damp));
            damped = true;
        }
        const normal = Array.isArray(best.area.data && best.area.data.normal) ? best.area.data.normal : [0, 0, 1];
        const direction = [Number(normal[0]) || 0, 0, Number(normal[2]) || 0];
        const scale = lightscreenScale(Number(best.area.data && best.area.data.width));
        const fold = Math.max(8, Math.min(40, Math.round(blocked * 1.4)));
        const dim = Math.max(6, Math.min(24, Math.round(blocked)));
        WorldFeedback.emit(world, lightscreenScene, 1, best.point,
            { moment: "block", fold: fold, dim: dim, direction: direction, scale: scale }, 22);
        if (damped) {
            WorldFeedback.emit(world, lightscreenScene, 1, best.point,
                { moment: "filter", direction: direction, scale: scale }, 20);
            WorldFeedback.text(world, lightscreenAbove(best.point, 0.4), lightscreenDampText, [], 22);
        }
        if (blocked >= 0.1) world.sound("minecraft:block.glass.hit", best.point, 12, "{}");
    } });

    const lightscreenThick = flag("thick", "厚幕");
    lightscreenThick.help = "厚幕：特殊减伤 ×1.18，但附带效果只滤掉柔幕的约六成，起手 +3 刻、冷却 ×1.12。柔幕：减伤 ×0.8，附带效果滤淡 ×1.3，起手 −2 刻、冷却 ×0.9。";

    define({
        id: lightscreenId,
        cooldownParameter: "recharge",
        name: "光墙",
        description: "在选定的落点立起一面朝向施放方向的柔光竖幕：只有从幕外真实穿过幕面、打向幕后友方的特殊攻击被削掉一块，附带效果也被滤淡。同侧来击、不在幕面宽高内的来击照常命中；幕可被破屏招清除，多个幕只按最强一面减伤。",
        uses: ["在敌方远程火线和队友之间立幕", "挡住成片、穿墙而来的特殊攻击", "在对方特殊输出前先一步摆好幕位"],
        kind: "point",
        range: 6,
        maxRange: 12,
        prepare: 11,
        active: 1,
        recover: 7,
        cooldown: 150,
        style: "veil",
        defaults: { thick: false },
        fields: [lightscreenThick],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lightscreenId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p(lightscreenId, "tempo", context))),
                recover: Math.max(3, Math.round(p(lightscreenId, "aftercast", context))),
                cooldown: Math.max(60, Math.round(p(lightscreenId, "recharge", context))),
                range: Math.max(2, Math.round(p(lightscreenId, "reach", context) * 10) / 10),
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lightscreen:windup", lightscreenScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? Math.max(1.5, p(lightscreenId, "screenRadius", pokemon)) : 3,
                geometry: "area", style: "veil", color: 0xFFE9A8, label: config && config.thick ? "厚幕" : "柔幕" };
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor();
            const point = action.targetPosition();
            const direction = WorldGeometry.flatUnit(point.minus(action.origin()), action.direction());
            const width = Math.max(1.5, p(lightscreenId, "screenRadius", action));
            const height = Math.max(1.5, p(lightscreenId, "screenHeight", action));
            const duration = Math.max(120, Math.round(p(lightscreenId, "screenTicks", action)));
            const motes = Math.max(1, Math.round(p(lightscreenId, "motes", action)));
            const cut = Math.max(0.05, Math.min(0.8, p(lightscreenId, "cut", action)));
            const damp = Math.max(0, Math.min(0.95, p(lightscreenId, "damp", action)));
            const thick = config && config.thick ? 1 : 0;
            const data = { normal: [direction.x(), 0, direction.z()], width: width, height: height, created: world.tick(),
                cut: cut, damp: damp, motes: motes, thick: thick, faded: false };
            WorldEffects.field(world, lightscreenMark, point, width, data, duration);
            const corners = lightscreenCorners([point.x(), point.y(), point.z()], data);
            const scale = lightscreenScale(width);
            WorldFeedback.emit(world, lightscreenScene, 1, point,
                { moment: "raise", path: lightscreenPath(corners), motes: motes, braces: thick ? 8 : 0, scale: scale }, 46);
            sound(action, "cobblemon:move.lightscreen.actor");
            world.sound("minecraft:block.glass.place", point, 14, "{}");
            WorldFeedback.text(world, lightscreenAbove(point, height), lightscreenRaiseText,
                [Math.round(duration / 20), Math.round(width * 2 * 10) / 10, Math.round(height * 10) / 10], 44);
            done(action);
        }
    });
}

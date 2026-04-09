#!/usr/bin/env python3
"""
MindCraft LSL Relay — Pont WebSocket → Lab Streaming Layer

Ce script crée un serveur WebSocket qui reçoit les marqueurs de MindCraft
et les retransmet via un flux LSL (Lab Streaming Layer).

Prérequis :
    pip install pylsl websockets

Usage :
    python lsl-relay.py [--port 12345]
"""

import asyncio
import json
import argparse

try:
    from pylsl import StreamInfo, StreamOutlet
except ImportError:
    print("Erreur : pylsl n'est pas installé.")
    print("Installez-le avec : pip install pylsl")
    exit(1)

try:
    import websockets
except ImportError:
    print("Erreur : websockets n'est pas installé.")
    print("Installez-le avec : pip install websockets")
    exit(1)


def create_lsl_outlet():
    info = StreamInfo(
        name='MindCraft-Markers',
        type='Markers',
        channel_count=1,
        nominal_srate=0,  # Irregular rate
        channel_format='string',
        source_id='mindcraft-stimulus-engine'
    )
    return StreamOutlet(info)


async def handler(websocket, outlet):
    print(f"[+] Client connecté : {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                marker = str(data.get('marker', ''))
                if marker:
                    outlet.push_sample([marker])
                    print(f"    → Marqueur envoyé : {marker}")
            except json.JSONDecodeError:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        print(f"[-] Client déconnecté")


async def main(port):
    outlet = create_lsl_outlet()
    print(f"╔══════════════════════════════════════════╗")
    print(f"║  MindCraft LSL Relay                     ║")
    print(f"║  WebSocket: ws://localhost:{port:<14}║")
    print(f"║  LSL Stream: MindCraft-Markers           ║")
    print(f"╚══════════════════════════════════════════╝")
    print(f"\nEn attente de connexions...\n")

    async with websockets.serve(lambda ws: handler(ws, outlet), "localhost", port):
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='MindCraft LSL Relay')
    parser.add_argument('--port', type=int, default=12345, help='Port WebSocket (défaut: 12345)')
    args = parser.parse_args()
    asyncio.run(main(args.port))

from fastapi import APIRouter, HTTPException
import nmap

router = APIRouter()


@router.get("/scan")
def nmap_scan(target: str, args: str = "-sV"):
    try:
        nm = nmap.PortScanner()
        nm.scan(hosts=target, arguments=args)

        results = []
        for host in nm.all_hosts():
            host_info = {
                "host": host,
                "status": nm[host].state(),
                "ports": [],
            }
            for proto in nm[host].all_protocols():
                ports = nm[host][proto].keys()
                for port in ports:
                    port_data = nm[host][proto][port]
                    host_info["ports"].append({
                        "port": port,
                        "protocol": proto,
                        "state": port_data.get("state", ""),
                        "service": port_data.get("name", ""),
                        "version": port_data.get("version", ""),
                    })
            results.append(host_info)

        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

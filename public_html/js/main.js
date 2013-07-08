/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

function qs(key) {
    key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
    var match = location.search.match(new RegExp("[?&]" + key + "=([^&]+)(&|$)"));
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
}

$(document).ready(function() {
    $("#search").autocomplete({
        source: function(request, response) {
            $.ajax({
                url: "http://en.wikipedia.org/w/api.php",
                dataType: "jsonp",
                data: {
                    'action': "opensearch",
                    'format': "json",
                    'namespace': 0,
                    'limit': 5,
                    'search': request.term
                },
                success: function(data) {
                    response(data[1]);
                }
            });
        },
    });
    $("#search_submit").button({disabled: false});
    $('form').onsubmit = function() {
        return false;
    };
    if (qs('query'))    // Search after loading when query is set
    {
        searchEvent(qs('query'));
        document.getElementById("search").value = qs('query');
    }
});
function clearSearchResults()
{
    $('div').remove(".result");
}
;
function addNormalResult(jsonData)
{
    var ni = document.getElementById('main_results');
    var newdiv = document.createElement('div');
    newdiv.setAttribute('class', 'result');
    obj = JSON.parse(jsonData);
    newdiv.innerHTML = "";
    if (obj.title)
    {
        if (obj.url)
        {
            newdiv.innerHTML += '<div class="title">' + '<a href="' + obj.url + '"><h2>' + obj.title + '</h2></a>' + '</div>';
        }
        else
        {
            newdiv.innerHTML += '<div class="title"><h2>' + obj.title + '</h2></div>';
        }
    }

    if (obj.content)
    {
        newdiv.innerHTML += '<div class="content"><p>' + obj.content + '</p></div>';
    }

    if (obj.crawler)
    {
        newdiv.innerHTML += '<div class="crawler"><i>found by ' + obj.crawler + '</i></div>';
    }

    newdiv.innerHTML += '<hr/>';
    ni.appendChild(newdiv);
}

function addSpecialResult(htmlData)
{
    var ni = document.getElementById('special_results');
    var newdiv = document.createElement('div');
    newdiv.setAttribute('class', 'result');
    newdiv.innerHTML = htmlData;
    ni.appendChild(newdiv);
}

function searchEvent(query)
{
    clearSearchResults();
    searchGoogle(query);
    searchWikipedia(query);
    searchNominatim(query);
    history.pushState(null, "Search:" + query, "?query=" + query);
    return false;
}

// help: https://developers.google.com/web-search/docs/reference?hl=de#_class_GwebSearch

function searchGoogle(query)
{
    $.ajax({
        url: "http://ajax.googleapis.com/ajax/services/search/web",
        dataType: "jsonp",
        data: {
            v: "1.0",
            q: query,
            rsz: 8
        },
        success: function(data) {
            var resultArray = data["responseData"]["results"];
            for (var i = 0; i < resultArray.length; i++)
            {
                var resultJSON = '{"title":"' + resultArray[i]["title"] + '","url":"' + resultArray[i]["url"] + '","content":"' + resultArray[i]["content"] + '","crawler":"google"}';
                addNormalResult(resultJSON);
            }
        }
    });
}

function searchWikipedia(query)
{
    $.ajax({
        url: "http://en.wikipedia.org/w/api.php",
        dataType: "jsonp",
        data: {
            action: "query",
            format: "json",
            prop: "revisions",
            rvlimit: 1,
            rvprop: "comment|timestamp",
            titles: query
        },
        success: function(data) {
            if (data["query"]["pages"]["-1"])
            {
            }
            else
            {
                var String = '<div class="wikipedia"><h3>Wikipedia found:</h3>';
                String += '<h4><a href="http://en.wikipedia.org/wiki/' + query + '">' + query + '</a></h4>';
                String += '</div>';
                String += "<hr/>";
                addSpecialResult(String);
            }
        }
    });
}

function searchNominatim(query)
{
    $.ajax({
        url: "http://nominatim.openstreetmap.org/search",
        dataType: "json",
        data: {
            format: "json",
            q: query
        },
        success: function(data) {
            if (data[0])
            {
                var String = '<div class="nominatim"><h3>Nominatim found:</h3>';
                String += data[0]["display_name"];
                String += '</div>';
                String += "<hr/>";
                addSpecialResult(String);

                switch (data[0]["type"])
                {
                    case "village":
                    case "city":
                    case "town":
                        searchOpenWeatherMap(query); // Start searching for weather-forecast
                        drawOpenStreetMap(parseFloat(data[0]['lat']), parseFloat(data[0]['lon']), 9);
                        break;
                    case "continent":
                        drawOpenStreetMap(parseFloat(data[0]['lat']), parseFloat(data[0]['lon']), 3);
                        break;
                    default:
                        drawOpenStreetMap(parseFloat(data[0]['lat']), parseFloat(data[0]['lon']), 6);
                        break;
                }
//                alert();

            }
        }
    });
}

function searchOpenWeatherMap(query)
{
    $.ajax({
        url: "http://api.openweathermap.org/data/2.5/forecast/daily",
        dataType: "jsonp",
        data: {
            cnt: 7,
            mode: "json",
            q: query
        },
        success: function(data) {

            var resultArray = data["list"];
            if (resultArray)
            {
                var String = '<div class="openweathermap"><h3>OpenWeatherMap found:</h3>';
                String += '<i>7-Day Weather-Forecast from ' + data['city']['name'] + ',' + data['city']['country'] + '</i>';
                String += '<table><tr><td><b> Day </b></td><td><b> Min-Temp </b></td><td><b> Max-Temp </b></td><td><b> Humidity </b></td><td><b> Weather </b></td></tr>';
                for (var i = 0; i < resultArray.length; i++)
                {
                    MinTemp = data['list'][i]['temp']['min'] - 273.15;
                    MaxTemp = data['list'][i]['temp']['max'] - 273.15;
                    String += '<tr><td>' + i + '</td>';
                    String += '<td> ' + MinTemp.toFixed(2) + ' °C</td>';
                    String += '<td> ' + MaxTemp.toFixed(2) + ' °C</td>';
                    String += '<td> ' + data['list'][i]['humidity'] + '%</td>';
                    String += '<td> ' + data['list'][i]['weather'][0]['description'] + '</td>';
                    String += '</tr>';
                }
                String += "</table></div><hr/>";
                addSpecialResult(String);
            }
        }
    });
}

function drawOpenStreetMap(lat, lon, zoom)
{
    if (!zoom)
    {
        zoom = 2;
    }
    var String = '<div class="openstreetmap"><h3>OpenStreetMap</h3>';
    String += '<div class="map" id="map" style="border:1px solid #999;width:500px;height:400px;"></div>';
    String += "</div><hr/>";
    addSpecialResult(String);

    var map = new ol.Map({
        layers: [
            new ol.layer.TileLayer({
                source: new ol.source.OSM()
            })
        ],
        renderers: ol.RendererHints.createFromQueryData(),
        target: 'map',
        view: new ol.View2D({
            center: ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857'),
            zoom: zoom
        })
    });
}